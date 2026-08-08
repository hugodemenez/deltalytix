import { NextResponse } from "next/server"
import { absoluteUrl } from "@/lib/agent-discovery/metadata"

export type ApiErrorBody = {
  error: string
  message: string
  details?: unknown
}

export function apiError(
  status: number,
  error: string,
  message: string,
  details?: unknown,
  headers?: HeadersInit,
): NextResponse {
  const body: ApiErrorBody = { error, message }
  if (details !== undefined) body.details = details
  return NextResponse.json(body, { status, headers })
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
  details?: unknown,
): NextResponse {
  return apiError(403, "insufficient_scope", message, details)
}

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
