import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/agent-discovery/metadata";

/**
 * Every `/api/*` failure answers with the same JSON envelope so an agent can
 * branch on `error.code` instead of scraping an HTML error page.
 *
 * ```json
 * {
 *   "error": {
 *     "code": "not_found",
 *     "message": "No API route matches GET /api/nope.",
 *     "hint": "List the available operations in the OpenAPI description.",
 *     "status": 404,
 *     "documentation_url": "https://deltalytix.app/docs/api"
 *   }
 * }
 * ```
 */
export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "method_not_allowed"
  | "conflict"
  | "unprocessable_entity"
  | "rate_limited"
  | "internal_error";

export const API_ERROR_STATUS: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  method_not_allowed: 405,
  conflict: 409,
  unprocessable_entity: 422,
  rate_limited: 429,
  internal_error: 500,
};

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    /** What the caller should do next — always present, never a restatement. */
    hint: string;
    status: number;
    documentation_url: string;
    /** Scopes that would have satisfied the request, on 401/403 only. */
    required_scopes?: string[];
    /** Field-level detail, on validation failures. */
    details?: { field: string; message: string }[];
  };
};

export type ApiErrorOptions = {
  code: ApiErrorCode;
  message: string;
  hint: string;
  /** Overrides the status mapped from `code`. */
  status?: number;
  requiredScopes?: string[];
  details?: { field: string; message: string }[];
  /** Used to resolve `documentation_url` against the current origin. */
  request?: Request;
  headers?: Record<string, string>;
};

export function apiErrorBody({
  code,
  message,
  hint,
  status,
  requiredScopes,
  details,
  request,
}: ApiErrorOptions): ApiErrorBody {
  return {
    error: {
      code,
      message,
      hint,
      status: status ?? API_ERROR_STATUS[code],
      documentation_url: absoluteUrl("/docs/api", request),
      ...(requiredScopes?.length ? { required_scopes: requiredScopes } : {}),
      ...(details?.length ? { details } : {}),
    },
  };
}

/** Build the `NextResponse` for a JSON API error. */
export function jsonError(options: ApiErrorOptions) {
  const body = apiErrorBody(options);

  return NextResponse.json(body, {
    status: body.error.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...options.headers,
    },
  });
}
