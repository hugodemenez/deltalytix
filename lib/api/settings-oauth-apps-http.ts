import { jsonError } from "@/lib/api/json-error"
import type { OAuthAppFieldError, OAuthAppInput } from "@/lib/api/oauth-app-input"

/**
 * Shared HTTP helpers for the session-authenticated
 * `/api/settings/oauth-apps` routes (Your apps in settings).
 */

/** `redirectUris[1]` for per-URI errors so the UI can pin them to a row. */
export function fieldErrorsToDetails(errors: OAuthAppFieldError[]) {
  return errors.map((error) => ({
    field:
      error.index === undefined ? error.field : `${error.field}[${error.index}]`,
    message: error.message,
  }))
}

export function invalidOAuthAppResponse(errors: OAuthAppFieldError[]) {
  return jsonError({
    code: "unprocessable_entity",
    message: errors[0]?.message ?? "Invalid app details.",
    hint: "Fix the fields listed in error.details and retry.",
    details: fieldErrorsToDetails(errors),
  })
}

export function oauthAppNotFoundResponse() {
  return jsonError({
    code: "not_found",
    message: "OAuth app not found, or you are not its owner.",
    hint: "List your apps with GET /api/settings/oauth-apps and use an id from that response.",
  })
}

export function settingsUnauthorizedResponse() {
  return jsonError({
    code: "unauthorized",
    message: "Authentication required to manage your OAuth apps.",
    hint: "Sign in to the dashboard, then retry this request with the session cookie.",
  })
}

export function settingsInternalErrorResponse() {
  return jsonError({
    code: "internal_error",
    message: "Something went wrong while updating your app.",
    hint: "Retry in a moment. If it keeps failing, contact support.",
  })
}

/**
 * Parse a JSON body into `OAuthAppInput`, keeping only known keys and leaving
 * type checks to `validateOAuthAppInput`. Returns null for a non-object body.
 */
export async function readOAuthAppInput(
  request: Request,
): Promise<OAuthAppInput | null> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return null
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return null
  const record = body as Record<string, unknown>
  const input: OAuthAppInput = {}
  if ("name" in record) input.name = record.name as string
  if ("description" in record) input.description = record.description as string | null
  if ("redirectUris" in record) input.redirectUris = record.redirectUris as string[]
  if ("scopes" in record) input.scopes = record.scopes as string[]
  return input
}

export function badJsonResponse() {
  return jsonError({
    code: "bad_request",
    message: "Request body must be a JSON object.",
    hint: "Send Content-Type: application/json with { name, description, redirectUris, scopes }.",
  })
}
