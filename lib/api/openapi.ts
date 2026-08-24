import type { NextRequest } from "next/server";
import {
  absoluteUrl,
  getOAuthEndpoint,
  READ_ONLY_SCOPES,
  scopeMap,
  scopeNames,
} from "@/lib/agent-discovery/metadata";
import { API_ERROR_STATUS, type ApiErrorCode } from "@/lib/api/json-error";

const ERROR_RESPONSES: {
  name: string;
  description: string;
  code: ApiErrorCode;
}[] = [
  {
    name: "BadRequest",
    description: "The request was malformed.",
    code: "bad_request",
  },
  {
    name: "Unauthorized",
    description: "No valid access token was presented.",
    code: "unauthorized",
  },
  {
    name: "Forbidden",
    description: "The access token is missing a required scope.",
    code: "forbidden",
  },
  {
    name: "NotFound",
    description: "No route or resource matches.",
    code: "not_found",
  },
  {
    name: "RateLimited",
    description: "Too many requests; retry after backing off.",
    code: "rate_limited",
  },
  {
    name: "InternalError",
    description: "Unexpected server error.",
    code: "internal_error",
  },
];

const ERROR_SCHEMA_REF = "#/components/schemas/Error";

/**
 * The OpenAPI 3.1 description served at `/openapi.json`.
 *
 * Kept pure so it can be asserted on directly; the route handler only wraps it
 * in a response. Scopes and error codes are read from the same modules the
 * runtime uses, so the published contract cannot drift from the implementation.
 */
export function buildOpenApiDocument(request?: NextRequest | Request) {
  const errorRef = { $ref: ERROR_SCHEMA_REF } as const;

  const errorResponses = Object.fromEntries(
    ERROR_RESPONSES.map(({ name, description }) => [
      name,
      { description, content: { "application/json": { schema: errorRef } } },
    ]),
  );

  const commonErrors = Object.fromEntries(
    ERROR_RESPONSES.map(({ name, code }) => [
      String(API_ERROR_STATUS[code]),
      { $ref: `#/components/responses/${name}` },
    ]),
  );

  return {
    openapi: "3.1.0",
    info: {
      title: "Deltalytix API",
      version: "0.4.0",
      description:
        "Public discovery description for Deltalytix trading analytics APIs. " +
        "Authorize with OAuth 2.0 and request only the scopes an agent needs. " +
        "Every failure uses the JSON `Error` envelope described below.",
      license: { name: "CC-BY-NC-4.0", url: absoluteUrl("/terms", request) },
    },
    externalDocs: {
      description: "API documentation",
      url: absoluteUrl("/docs/api", request),
    },
    servers: [{ url: absoluteUrl("/api", request) }],
    // Default requirement for authenticated operations: the narrowest useful
    // scope set. Individual operations widen it or opt out with `security: [{}]`.
    security: [
      { oauth2: READ_ONLY_SCOPES },
      { bearerAuth: [] },
      { apiKeyAuth: [] },
    ],
    paths: {
      "/": {
        get: {
          operationId: "getApiStatus",
          summary: "API status",
          description:
            "Confirms the API is reachable and points at the description document.",
          security: [{}],
          responses: {
            "200": {
              description: "API is reachable",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["status", "scopes_supported"],
                    properties: {
                      message: { type: "string" },
                      status: { type: "string", enum: ["ok"] },
                      documentation_url: { type: "string", format: "uri" },
                      openapi_url: { type: "string", format: "uri" },
                      scopes_supported: {
                        type: "array",
                        items: { type: "string", enum: scopeNames() },
                      },
                    },
                  },
                },
              },
            },
            ...commonErrors,
          },
        },
      },
    },
    components: {
      securitySchemes: {
        oauth2: {
          type: "oauth2",
          description:
            "Scoped OAuth 2.0 authorization. Request the narrowest scope set that covers " +
            `the task; read-only agents should request ${READ_ONLY_SCOPES.join(", ")}.`,
          flows: {
            authorizationCode: {
              authorizationUrl: getOAuthEndpoint("authorize", request),
              tokenUrl: getOAuthEndpoint("token", request),
              refreshUrl: getOAuthEndpoint("token", request),
              scopes: scopeMap(),
            },
          },
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Access token issued by the authorization server. The token's scope claim is " +
            "enforced per operation.",
        },
        apiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description:
            "Server-to-server API key. Each key carries a role that maps onto the same " +
            "scope names as the OAuth flow.",
        },
      },
      responses: errorResponses,
      schemas: {
        Error: {
          type: "object",
          description:
            "Structured error envelope returned by every /api/* failure, including unmatched paths.",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              // `apiErrorBody` always fills these in; the optional members
              // below (`required_scopes`, `details`) are the only ones a caller
              // can find missing.
              required: [
                "code",
                "message",
                "hint",
                "status",
                "documentation_url",
              ],
              properties: {
                code: {
                  type: "string",
                  description: "Stable, machine-readable error code.",
                  enum: Object.keys(API_ERROR_STATUS),
                },
                message: {
                  type: "string",
                  description: "Human-readable description of what went wrong.",
                },
                hint: {
                  type: "string",
                  description: "How to resolve the error.",
                },
                status: {
                  type: "integer",
                  description: "HTTP status code, repeated for convenience.",
                },
                documentation_url: { type: "string", format: "uri" },
                required_scopes: {
                  type: "array",
                  description: "Scopes that would have satisfied the request.",
                  items: { type: "string", enum: scopeNames() },
                },
                details: {
                  type: "array",
                  description: "Field-level validation detail.",
                  items: {
                    type: "object",
                    required: ["field", "message"],
                    properties: {
                      field: { type: "string" },
                      message: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}
