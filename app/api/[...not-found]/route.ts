import type { NextRequest } from "next/server";
import { jsonError } from "@/lib/api/json-error";
import { withPublicApiRequestLog } from "@/lib/api/with-request-log";

/**
 * Catch-all for unmatched `/api/*` paths.
 *
 * Without it Next.js falls through to the HTML error document, which an agent
 * cannot parse. Every method answers with the shared JSON error envelope.
 *
 * Wrapped so unmatched `/api/v1/*` and `/api/oauth/*` still emit one structured
 * request log line (other `/api/*` misses stay silent).
 */
function notFound(request: NextRequest) {
  const { pathname } = request.nextUrl;

  return jsonError({
    code: "not_found",
    message: `No API route matches ${request.method} ${pathname}.`,
    hint: "Check the OpenAPI description at /openapi.json for the available operations, or the API catalog at /.well-known/api-catalog.",
    request,
  });
}

const loggedNotFound = withPublicApiRequestLog(notFound);

export const GET = loggedNotFound;
export const POST = loggedNotFound;
export const PUT = loggedNotFound;
export const PATCH = loggedNotFound;
export const DELETE = loggedNotFound;
export const HEAD = loggedNotFound;
export const OPTIONS = loggedNotFound;
