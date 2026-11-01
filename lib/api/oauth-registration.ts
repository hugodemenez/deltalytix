import { prisma } from "@/lib/prisma"
import { redirectUriProblem } from "@/lib/api/redirect-uri"
import { API_SCOPES, isValidScope, parseScopes, type ApiScope } from "@/lib/api/scopes"
import {
  generateClientId,
  generateClientSecret,
  sha256,
} from "@/lib/api/tokens"

export const REGISTRATION_LIMIT = 10
export const REGISTRATION_WINDOW_MS = 60 * 60 * 1000
export const REGISTRATION_MAX_NAME = 80
export const REGISTRATION_MAX_URIS = 10

const READ_SCOPES = API_SCOPES.filter((scope) => scope.endsWith(":read"))
const SECRET_METHODS = new Set(["client_secret_basic", "client_secret_post"])
const GRANT_TYPES = new Set(["authorization_code", "refresh_token"])

export type RegistrationSuccess = {
  clientId: string
  clientSecret: string | null
  clientName: string
  redirectUris: string[]
  grantTypes: string[]
  responseTypes: string[]
  tokenEndpointAuthMethod: "none" | "client_secret_basic" | "client_secret_post"
  scope: ApiScope[]
  clientIdIssuedAt: number
}

export type RegistrationFailure = {
  error: "invalid_client_metadata" | "invalid_request"
  description: string
}

export type ValidatedClientMetadata = {
  clientName: string
  redirectUris: string[]
  grantTypes: string[]
  responseTypes: string[]
  tokenEndpointAuthMethod: RegistrationSuccess["tokenEndpointAuthMethod"]
  scope: ApiScope[]
  logoUrl: string | null
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  if (!value.every((entry) => typeof entry === "string")) return null
  return value
}

/**
 * RFC 7591 metadata check. Public clients (`none` or omitted) are the MCP
 * path. An explicit client-secret method still registers a confidential
 * client and receives a secret once. Redirect URIs are exact: https, or http
 * on loopback, with no wildcards.
 */
export function validateClientRegistration(
  body: unknown,
): { ok: true; value: ValidatedClientMetadata } | { ok: false; failure: RegistrationFailure } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      failure: { error: "invalid_request", description: "Request body must be a JSON object" },
    }
  }
  const record = body as Record<string, unknown>

  const rawName = typeof record.client_name === "string" ? record.client_name.trim() : ""
  if (!rawName) {
    return {
      ok: false,
      failure: { error: "invalid_client_metadata", description: "client_name is required" },
    }
  }
  if (rawName.length > REGISTRATION_MAX_NAME || /[\u0000-\u001f\u007f]/.test(rawName)) {
    return {
      ok: false,
      failure: {
        error: "invalid_client_metadata",
        description: `client_name must be ${REGISTRATION_MAX_NAME} characters or fewer and contain no control characters`,
      },
    }
  }

  const redirectUris = asStringArray(record.redirect_uris)
  if (!redirectUris || redirectUris.length === 0) {
    return {
      ok: false,
      failure: { error: "invalid_client_metadata", description: "redirect_uris is required" },
    }
  }
  if (redirectUris.length > REGISTRATION_MAX_URIS) {
    return {
      ok: false,
      failure: {
        error: "invalid_client_metadata",
        description: `redirect_uris accepts at most ${REGISTRATION_MAX_URIS} URIs`,
      },
    }
  }
  const normalizedUris: string[] = []
  for (const entry of redirectUris) {
    const uri = entry.trim()
    const problem = redirectUriProblem(uri)
    if (problem) {
      return {
        ok: false,
        failure: {
          error: "invalid_client_metadata",
          description: `redirect_uri ${uri || "(empty)"} ${problem}`,
        },
      }
    }
    if (!normalizedUris.includes(uri)) normalizedUris.push(uri)
  }

  const methodRaw =
    typeof record.token_endpoint_auth_method === "string"
      ? record.token_endpoint_auth_method
      : "none"
  if (methodRaw !== "none" && !SECRET_METHODS.has(methodRaw)) {
    return {
      ok: false,
      failure: {
        error: "invalid_client_metadata",
        description:
          "token_endpoint_auth_method must be none, client_secret_basic, or client_secret_post",
      },
    }
  }
  const tokenEndpointAuthMethod = methodRaw as RegistrationSuccess["tokenEndpointAuthMethod"]

  let grantTypes = ["authorization_code", "refresh_token"]
  if (record.grant_types !== undefined) {
    const grants = asStringArray(record.grant_types)
    if (!grants || grants.length === 0 || grants.some((grant) => !GRANT_TYPES.has(grant))) {
      return {
        ok: false,
        failure: {
          error: "invalid_client_metadata",
          description: "grant_types must be authorization_code and refresh_token",
        },
      }
    }
    if (!grants.includes("authorization_code")) {
      return {
        ok: false,
        failure: {
          error: "invalid_client_metadata",
          description: "grant_types must include authorization_code",
        },
      }
    }
    grantTypes = [...new Set(grants)]
  }

  let responseTypes = ["code"]
  if (record.response_types !== undefined) {
    const responses = asStringArray(record.response_types)
    if (!responses || responses.length !== 1 || responses[0] !== "code") {
      return {
        ok: false,
        failure: {
          error: "invalid_client_metadata",
          description: "response_types must be code",
        },
      }
    }
    responseTypes = ["code"]
  }

  let scope: ApiScope[] = [...READ_SCOPES]
  if (typeof record.scope === "string" && record.scope.trim()) {
    const requested = parseScopes(record.scope)
    if (requested.some((entry) => !isValidScope(entry))) {
      return {
        ok: false,
        failure: {
          error: "invalid_client_metadata",
          description: "scope contains an unknown value",
        },
      }
    }
    scope = requested.filter(isValidScope)
  }

  let logoUrl: string | null = null
  if (record.logo_uri !== undefined && record.logo_uri !== null && record.logo_uri !== "") {
    if (typeof record.logo_uri !== "string") {
      return {
        ok: false,
        failure: { error: "invalid_client_metadata", description: "logo_uri must be an https URL" },
      }
    }
    const problem = redirectUriProblem(record.logo_uri)
    if (problem || !record.logo_uri.startsWith("https://")) {
      return {
        ok: false,
        failure: { error: "invalid_client_metadata", description: "logo_uri must be an https URL" },
      }
    }
    logoUrl = record.logo_uri
  }

  return {
    ok: true,
    value: {
      clientName: rawName,
      redirectUris: normalizedUris,
      grantTypes,
      responseTypes,
      tokenEndpointAuthMethod,
      scope,
      logoUrl,
    },
  }
}

function firstHeaderAddress(value: string | null): string {
  return value?.split(",")[0]?.trim() || ""
}

/**
 * Client address for the registration window. Vercel sets
 * `x-vercel-forwarded-for` and `x-real-ip` at the edge; the first
 * `X-Forwarded-For` entry is client-controlled, so it is only a fallback.
 */
export function registrationClientKey(request: Request): string {
  const ip =
    firstHeaderAddress(request.headers.get("x-vercel-forwarded-for")) ||
    request.headers.get("x-real-ip")?.trim() ||
    firstHeaderAddress(request.headers.get("x-forwarded-for")) ||
    "unknown"
  return sha256(`oauth-register:${ip}`)
}

export async function consumeRegistrationAttempt(keyHash: string): Promise<boolean> {
  const since = new Date(Date.now() - REGISTRATION_WINDOW_MS)
  await prisma.oAuthRegistrationAttempt.deleteMany({
    where: { createdAt: { lt: since } },
  })
  const recent = await prisma.oAuthRegistrationAttempt.count({
    where: { keyHash, createdAt: { gte: since } },
  })
  if (recent >= REGISTRATION_LIMIT) return false
  await prisma.oAuthRegistrationAttempt.create({ data: { keyHash } })
  return true
}

export async function registerOAuthClient(
  value: ValidatedClientMetadata,
): Promise<RegistrationSuccess> {
  const clientSecret =
    value.tokenEndpointAuthMethod === "none" ? null : generateClientSecret()
  const clientId = generateClientId()
  const created = await prisma.oAuthApp.create({
    data: {
      userId: null,
      name: value.clientName,
      logoUrl: value.logoUrl ?? null,
      clientId,
      clientSecretHash: clientSecret ? sha256(clientSecret) : null,
      tokenEndpointAuthMethod: value.tokenEndpointAuthMethod,
      dynamicallyRegistered: true,
      redirectUris: value.redirectUris,
      scopes: value.scope,
      secretRotatedAt: clientSecret ? new Date() : null,
    },
    select: { createdAt: true },
  })

  return {
    clientId,
    clientSecret,
    clientName: value.clientName,
    redirectUris: value.redirectUris,
    grantTypes: value.grantTypes,
    responseTypes: value.responseTypes,
    tokenEndpointAuthMethod: value.tokenEndpointAuthMethod,
    scope: value.scope,
    clientIdIssuedAt: Math.floor(created.createdAt.getTime() / 1000),
  }
}
