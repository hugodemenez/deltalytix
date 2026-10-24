import { AsyncLocalStorage } from "node:async_hooks"
import { sha256 } from "@/lib/api/tokens"

/**
 * One structured log line per public API / OAuth request.
 *
 * Uses the same console-backed logger style as the rest of the server
 * (`console.info` / `console.error`) so Vercel / Docker log drains pick up a
 * single JSON object — never tokens, secrets, or Authorization headers.
 */

export type PublicApiTokenType = "oauth" | "pat" | "client" | "none" | "unknown"

export type PublicApiRequestLogContext = {
  tokenType?: PublicApiTokenType
  appId?: string | null
  clientId?: string | null
  userId?: string | null
}

export type PublicApiRequestLogFields = {
  method: string
  route: string
  status: number
  latencyMs: number
  tokenType: PublicApiTokenType
  appId: string | null
  clientId: string | null
  /** SHA-256 hex of the acting user id (never the raw id). */
  userIdHash: string | null
  /** Present on 4xx/5xx when the response body exposes an error code. */
  errorCode?: string
}

const requestLogStore = new AsyncLocalStorage<PublicApiRequestLogContext>()

/** Raw credential prefixes that must never appear in a log line. */
const LEAKED_TOKEN_PREFIX = /dltx_(?:at|rt|pat|ac|secret)_/

export function isPublicApiLogPath(pathname: string): boolean {
  return (
    pathname === "/api/v1" ||
    pathname.startsWith("/api/v1/") ||
    pathname === "/api/oauth" ||
    pathname.startsWith("/api/oauth/") ||
    pathname === "/api/mcp"
  )
}

export function hashUserIdForLog(userId: string): string {
  return sha256(userId)
}

export function inferTokenTypeFromBearer(
  token: string | null | undefined,
): PublicApiTokenType {
  if (!token) return "none"
  if (token.startsWith("dltx_pat_")) return "pat"
  if (token.startsWith("dltx_at_")) return "oauth"
  return "unknown"
}

export function setPublicApiRequestLogContext(
  patch: PublicApiRequestLogContext,
): void {
  const current = requestLogStore.getStore()
  if (!current) return
  Object.assign(current, patch)
}

export function getPublicApiRequestLogContext(): PublicApiRequestLogContext {
  return requestLogStore.getStore() ?? {}
}

export function runWithPublicApiRequestLogContext<T>(
  initial: PublicApiRequestLogContext,
  fn: () => T,
): T {
  return requestLogStore.run({ ...initial }, fn)
}

/** Pull the machine-readable error code from an API or OAuth error body. */
export async function readErrorCodeFromResponse(
  response: Response,
): Promise<string | undefined> {
  if (response.status < 400) return undefined

  try {
    const data: unknown = await response.clone().json()
    if (!data || typeof data !== "object") return undefined

    const error = (data as { error?: unknown }).error
    if (typeof error === "string" && error.length > 0) {
      // RFC 6749 OAuth token/revoke shape: `{ error, error_description }`
      return error
    }
    if (
      error &&
      typeof error === "object" &&
      typeof (error as { code?: unknown }).code === "string"
    ) {
      // Shared `/api/*` envelope from `jsonError()`
      return (error as { code: string }).code
    }
  } catch {
    // Empty / non-JSON bodies (e.g. unexpected 500 HTML) — omit errorCode.
  }

  return undefined
}

export function buildPublicApiRequestLogFields(input: {
  method: string
  route: string
  status: number
  latencyMs: number
  context?: PublicApiRequestLogContext
  errorCode?: string
}): PublicApiRequestLogFields {
  const context = input.context ?? getPublicApiRequestLogContext()
  const userId = context.userId ?? null

  return {
    method: input.method,
    route: input.route,
    status: input.status,
    latencyMs: Math.max(0, Math.round(input.latencyMs)),
    tokenType: context.tokenType ?? "none",
    appId: context.appId ?? null,
    clientId: context.clientId ?? null,
    userIdHash: userId ? hashUserIdForLog(userId) : null,
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
  }
}

/**
 * Assert the serialized log line cannot carry bearer tokens / client secrets.
 * Used by unit tests and as a last-line guard before writing.
 */
export function assertNoSecretsInLogPayload(
  serialized: string,
  knownSecrets: string[] = [],
): void {
  for (const secret of knownSecrets) {
    if (secret && serialized.includes(secret)) {
      throw new Error("public API request log would leak a secret")
    }
  }
  if (serialized.includes("Authorization") || serialized.includes("Bearer ")) {
    throw new Error("public API request log must not include Authorization")
  }
}

export function serializePublicApiRequestLog(
  fields: PublicApiRequestLogFields,
): string {
  // Fixed key order so log lines stay greppable and diffs stay stable.
  const line = JSON.stringify({
    msg: "public_api_request",
    method: fields.method,
    route: fields.route,
    status: fields.status,
    latencyMs: fields.latencyMs,
    tokenType: fields.tokenType,
    appId: fields.appId,
    clientId: fields.clientId,
    userIdHash: fields.userIdHash,
    ...(fields.errorCode ? { errorCode: fields.errorCode } : {}),
  })

  // Client ids (`dltx_app_…`) are intentional; access / refresh / PAT /
  // authorization-code / secret prefixes must never appear.
  if (
    LEAKED_TOKEN_PREFIX.test(line) ||
    /"clientSecret"/.test(line) ||
    /"access_token"/.test(line) ||
    /"refresh_token"/.test(line)
  ) {
    throw new Error("public API request log would leak a token-shaped value")
  }

  return line
}

/** Emit exactly one structured log line for the request. */
export function logPublicApiRequest(fields: PublicApiRequestLogFields): void {
  const line = serializePublicApiRequestLog(fields)
  console.info(line)
}
