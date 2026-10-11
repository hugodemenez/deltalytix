import { NextResponse } from "next/server"
import { absoluteUrl } from "@/lib/agent-discovery/metadata"
import {
  API_ERROR_STATUS,
  jsonError,
  type ApiErrorCode,
} from "@/lib/api/json-error"

/**
 * `/api/v1` speaks the same JSON error envelope as the rest of `/api/*` (see
 * `lib/api/json-error.ts`), so an agent can branch on `error.code` no matter
 * which route it hit.
 *
 * The helpers here keep the short slug the call sites already pass — it names
 * the failure more precisely than the envelope's closed `code` union — and turn
 * it into the `hint` that tells the caller what to do next.
 */

const STATUS_CODES: Record<number, ApiErrorCode> = Object.fromEntries(
  Object.entries(API_ERROR_STATUS).map(([code, status]) => [
    status,
    code as ApiErrorCode,
  ]),
)

/** Slug -> what the caller should do about it. */
const HINTS: Record<string, string> = {
  ai_import_failed:
    "The AI import service could not parse the file. Retry, or import it from the dashboard where you can map columns by hand.",
  connection_failed:
    "Check the broker credentials in the request body and confirm the account is active with the broker.",
  database_error:
    "The request was valid but could not be persisted. Retry; if it keeps failing, contact support with the request time.",
  insufficient_scope:
    "Re-authorize with the scopes listed in required_scopes, then retry.",
  invalid_json: "Send a JSON body with Content-Type: application/json.",
  invalid_multipart:
    "Send the file as multipart/form-data with file, type, and accountNumber parts.",
  invalid_request: "Check the required parameters for this operation.",
  not_found:
    "List the available resources first; the id in the path does not belong to this user.",
  parse_error:
    "The file could not be read. Confirm it is a valid CSV or XLSX export from the platform named in `type`.",
  sync_failed:
    "The broker rejected the sync. Re-check the stored credentials, then trigger the sync again.",
  unauthorized:
    "Present a valid OAuth access token or personal access token as `Authorization: Bearer <token>`.",
  unsupported_platform:
    "Use one of the supported `type` values: ai, tradezella, topstep, ftmo, tradovate.",
  unsupported_service:
    "Use one of the supported services: ibkr, dxfeed, rithmic-protocol, tradovate.",
  validation_error:
    "Fix the fields named in `details` and resend the request.",
}

function hintFor(slug: string) {
  return (
    HINTS[slug] ??
    "See the OpenAPI description at /openapi.json for this operation's contract."
  )
}

/** Field-level detail, when the caller passed something shaped like it. */
function toDetails(details: unknown) {
  if (!Array.isArray(details)) return undefined

  const entries = details.filter(
    (entry): entry is { field: string; message: string } =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { field?: unknown }).field === "string" &&
      typeof (entry as { message?: unknown }).message === "string",
  )

  return entries.length ? entries : undefined
}

export function apiError(
  status: number,
  slug: string,
  message: string,
  details?: unknown,
  headers?: Record<string, string>,
  requiredScopes?: string[],
): NextResponse {
  const structured = toDetails(details)

  return jsonError({
    code: STATUS_CODES[status] ?? "internal_error",
    message,
    hint: hintFor(slug),
    status,
    ...(structured ? { details: structured } : {}),
    ...(requiredScopes?.length ? { requiredScopes } : {}),
    ...(headers ? { headers } : {}),
  })
}

export function unauthorized(
  message = "Missing or invalid access token",
  request?: Request,
): NextResponse {
  const resourceMetadata = absoluteUrl(
    "/.well-known/oauth-protected-resource",
    request,
  )

  return apiError(401, "unauthorized", message, undefined, {
    "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadata}"`,
  })
}

export function insufficientScope(
  message = "Token is missing required scopes",
  requiredScopes?: string[],
): NextResponse {
  return apiError(
    403,
    "insufficient_scope",
    message,
    undefined,
    undefined,
    requiredScopes,
  )
}

/**
 * RFC 6749 `{ error, error_description }`. The token and revoke endpoints must
 * use this shape rather than the API envelope — OAuth clients parse it.
 */
export function oauthError(
  status: number,
  error: string,
  errorDescription: string,
): NextResponse {
  return NextResponse.json(
    { error, error_description: errorDescription },
    { status },
  )
}
