import type { NextRequest } from "next/server"
import { jsonError } from "@/lib/api/json-error"
import { oauthError } from "@/lib/api/errors"
import {
  buildPublicApiRequestLogFields,
  getPublicApiRequestLogContext,
  inferTokenTypeFromBearer,
  isPublicApiLogPath,
  logPublicApiRequest,
  readErrorCodeFromResponse,
  runWithPublicApiRequestLogContext,
  type PublicApiRequestLogContext,
} from "@/lib/api/request-log"

type RouteContext = { params?: Promise<Record<string, string | string[]>> }

type AppRouteHandler<C = RouteContext> = (
  request: NextRequest,
  context: C,
) => Response | Promise<Response>

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization")
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

function initialContextFromRequest(
  request: Request,
): PublicApiRequestLogContext {
  const bearer = extractBearerToken(request)
  return {
    tokenType: inferTokenTypeFromBearer(bearer),
  }
}

async function finalizeAndLog(
  request: NextRequest,
  startedAt: number,
  response: Response,
): Promise<Response> {
  const pathname = request.nextUrl?.pathname ?? new URL(request.url).pathname
  if (!isPublicApiLogPath(pathname)) {
    return response
  }

  const errorCode = await readErrorCodeFromResponse(response)
  const fields = buildPublicApiRequestLogFields({
    method: request.method,
    route: pathname,
    status: response.status,
    latencyMs: performance.now() - startedAt,
    context: getPublicApiRequestLogContext(),
    errorCode,
  })

  try {
    logPublicApiRequest(fields)
  } catch {
    // Never fail the request because logging rejected a payload.
    console.error(
      JSON.stringify({
        msg: "public_api_request_log_failed",
        method: request.method,
        route: pathname,
        status: response.status,
      }),
    )
  }

  return response
}

function errorResponseForPath(pathname: string): Response {
  if (pathname === "/api/oauth" || pathname.startsWith("/api/oauth/")) {
    return oauthError(500, "server_error", "Unexpected server error")
  }
  return jsonError({
    code: "internal_error",
    message: "Unexpected server error",
    hint: "Retry the request. If it keeps failing, contact support with the request time.",
  })
}

/**
 * Wrap an App Router handler so every `/api/v1`, `/api/oauth`, and `/api/mcp`
 * request emits exactly one structured log line (method, route, status,
 * latency, actor).
 *
 * The returned handler accepts an optional context so unit tests can call
 * `GET(request)` while App Router still passes `{ params }`.
 */
export function withPublicApiRequestLog<C extends RouteContext = RouteContext>(
  handler: AppRouteHandler<C>,
): (
  request: NextRequest,
  context?: C,
) => Promise<Response> {
  return async (request, context) => {
    const pathname = request.nextUrl?.pathname ?? new URL(request.url).pathname
    const startedAt = performance.now()

    return runWithPublicApiRequestLogContext(
      initialContextFromRequest(request),
      async () => {
        try {
          const response = await handler(request, (context ?? {}) as C)
          return finalizeAndLog(request, startedAt, response)
        } catch (error) {
          const label = pathname.startsWith("/api/oauth")
            ? "oauth"
            : pathname === "/api/mcp"
              ? "mcp"
              : "api/v1"
          console.error(`[${label}]`, error)
          const response = errorResponseForPath(pathname)
          return finalizeAndLog(request, startedAt, response)
        }
      },
    )
  }
}
