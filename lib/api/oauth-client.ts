import { timingSafeEqual } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { sha256 } from "@/lib/api/tokens"
import type { NextRequest } from "next/server"

export type OAuthClientCredentials = {
  clientId?: string
  clientSecret?: string
}

export type AuthenticatedOAuthApp = {
  id: string
  clientId: string
  clientSecretHash: string
  scopes: string[]
  redirectUris: string[]
}

/** The request body is neither valid JSON nor a form. */
export class InvalidOAuthRequestBody extends Error {}

/** RFC 6749 §2.3.1 — `Authorization: Basic base64(url-encoded-id:url-encoded-secret)`. */
export function parseBasicClientAuth(
  header: string | null | undefined,
): { clientId: string; clientSecret: string } | null {
  if (!header) return null
  const match = header.match(/^Basic\s+(.+)$/i)
  if (!match?.[1]) return null

  try {
    const decoded = Buffer.from(match[1], "base64").toString("utf8")
    const separator = decoded.indexOf(":")
    if (separator < 0) return null
    const clientId = decodeURIComponent(decoded.slice(0, separator))
    const clientSecret = decodeURIComponent(decoded.slice(separator + 1))
    if (!clientId) return null
    return { clientId, clientSecret }
  } catch {
    return null
  }
}

export function resolveClientCredentials(
  request: Pick<Request, "headers">,
  body: Record<string, string>,
): OAuthClientCredentials {
  const basic = parseBasicClientAuth(request.headers.get("authorization"))
  if (basic) {
    return basic
  }
  return {
    clientId: body.client_id || undefined,
    clientSecret: body.client_secret || undefined,
  }
}

export async function readOAuthFormOrJson(
  request: NextRequest,
): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    let json: unknown
    try {
      json = await request.json()
    } catch {
      throw new InvalidOAuthRequestBody("Request body is not valid JSON")
    }
    if (!json || typeof json !== "object" || Array.isArray(json)) {
      throw new InvalidOAuthRequestBody("Request body must be a JSON object")
    }
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(json)) {
      if (value != null) out[key] = String(value)
    }
    return out
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    throw new InvalidOAuthRequestBody(
      "Request body must be form-urlencoded or JSON",
    )
  }
  const out: Record<string, string> = {}
  form.forEach((value, key) => {
    if (typeof value === "string") out[key] = value
  })
  return out
}

/**
 * Every registered app is a confidential client: it is issued a secret at
 * creation and there is no public-client registration, so the secret is
 * required on every grant and on revocation.
 */
export function clientSecretSatisfies(
  clientSecretHash: string,
  clientSecret: string | undefined,
): boolean {
  if (!clientSecret) return false
  const expected = Buffer.from(clientSecretHash, "utf8")
  const actual = Buffer.from(sha256(clientSecret), "utf8")
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export async function authenticateOAuthClient(
  credentials: OAuthClientCredentials,
): Promise<AuthenticatedOAuthApp | null> {
  const { clientId, clientSecret } = credentials
  if (!clientId) return null

  const app = await prisma.oAuthApp.findUnique({ where: { clientId } })
  if (!app) return null

  if (!clientSecretSatisfies(app.clientSecretHash, clientSecret)) {
    return null
  }

  return app
}
