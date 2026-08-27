import type { NextRequest } from "next/server";
import { jsonError } from "@/lib/api/json-error";

/**
 * Catch-all for unmatched `/api/*` paths.
 *
 * Without it Next.js falls through to the HTML error document, which an agent
 * cannot parse. Every method answers with the shared JSON error envelope.
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

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const HEAD = notFound;
export const OPTIONS = notFound;
