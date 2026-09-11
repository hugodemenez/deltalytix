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
    name: "UnprocessableEntity",
    description: "The request was understood but cannot be fulfilled.",
    code: "unprocessable_entity",
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

/** `{ "400": { $ref: … }, … }` for the named error responses listed. */
function errorRefs(...names: string[]) {
  return Object.fromEntries(
    ERROR_RESPONSES.filter(({ name }) => names.includes(name)).map(
      ({ name, code }) => [
        String(API_ERROR_STATUS[code]),
        { $ref: `#/components/responses/${name}` },
      ],
    ),
  );
}

/** Errors any authenticated `/v1` operation can return. */
const AUTHED_ERRORS = errorRefs(
  "BadRequest",
  "Unauthorized",
  "Forbidden",
  "NotFound",
  "RateLimited",
  "InternalError",
);

const TRADE_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string" },
    accountNumber: { type: "string" },
    instrument: { type: "string" },
    side: { type: ["string", "null"] },
    quantity: { type: "integer" },
    entryPrice: { type: "string" },
    closePrice: { type: "string" },
    entryDate: { type: "string", format: "date-time" },
    closeDate: { type: "string", format: "date-time" },
    pnl: { type: "number" },
    commission: { type: "number" },
    timeInPosition: { type: "number" },
    tags: { type: "array", items: { type: "string" } },
    comment: { type: ["string", "null"] },
    createdAt: { type: "string", format: "date-time" },
  },
} as const;

/**
 * The OpenAPI 3.1 description served at `/openapi.json`.
 *
 * Kept pure so it can be asserted on directly; the route handler only wraps it
 * in a response. Scopes and error codes are read from the same modules the
 * runtime uses, so the published contract cannot drift from the implementation.
 *
 * Paths are relative to the `/api` server, so `/v1/trades` below is served at
 * `https://<host>/api/v1/trades`.
 */
export function buildOpenApiDocument(request?: NextRequest | Request) {
  const errorRef = { $ref: ERROR_SCHEMA_REF } as const;

  const errorResponses = Object.fromEntries(
    ERROR_RESPONSES.map(({ name, description }) => [
      name,
      { description, content: { "application/json": { schema: errorRef } } },
    ]),
  );

  const commonErrors = errorRefs(...ERROR_RESPONSES.map(({ name }) => name));

  return {
    openapi: "3.1.0",
    info: {
      title: "Deltalytix API",
      version: "1.0.0",
      description:
        "OAuth 2.0 protected REST API for Deltalytix trades, accounts, broker " +
        "connections, imports, and performance metrics. Authorize with OAuth 2.0 " +
        "and request only the scopes an agent needs. Every failure uses the JSON " +
        "`Error` envelope described below.",
      license: { name: "CC-BY-NC-4.0", url: absoluteUrl("/terms", request) },
    },
    externalDocs: {
      description: "API documentation",
      url: absoluteUrl("/docs/api", request),
    },
    servers: [{ url: absoluteUrl("/api", request) }],
    // Default requirement for authenticated operations: the narrowest useful
    // scope set. Individual operations widen it or opt out with `security: [{}]`.
    security: [{ oauth2: READ_ONLY_SCOPES }, { bearerAuth: [] }],
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
      "/oauth/token": {
        post: {
          operationId: "exchangeOAuthToken",
          summary: "Exchange an authorization code or refresh token",
          description:
            "RFC 6749 token endpoint. Errors use the OAuth `error` / " +
            "`error_description` shape, not the API `Error` envelope.",
          security: [{}],
          requestBody: {
            required: true,
            content: {
              "application/x-www-form-urlencoded": {
                schema: {
                  type: "object",
                  required: ["grant_type", "client_id"],
                  properties: {
                    grant_type: {
                      type: "string",
                      enum: ["authorization_code", "refresh_token"],
                    },
                    code: { type: "string" },
                    redirect_uri: { type: "string" },
                    client_id: { type: "string" },
                    client_secret: { type: "string" },
                    code_verifier: { type: "string" },
                    refresh_token: { type: "string" },
                  },
                },
              },
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
          responses: {
            "200": {
              description: "Token response",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/OAuthTokenResponse" },
                },
              },
            },
            "400": {
              description: "OAuth error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/OAuthError" },
                },
              },
            },
            "401": {
              description: "Invalid client credentials",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/OAuthError" },
                },
              },
            },
          },
        },
      },
      "/oauth/revoke": {
        post: {
          operationId: "revokeOAuthToken",
          summary: "Revoke an access or refresh token",
          description:
            "RFC 7009 revocation endpoint. Always answers 200 so a caller cannot " +
            "probe which tokens exist.",
          security: [{}],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token"],
                  properties: {
                    token: {
                      type: "string",
                      description: "Access or refresh token to revoke",
                    },
                    client_id: { type: "string" },
                    client_secret: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Always succeeds" },
          },
        },
      },
      "/v1/me": {
        get: {
          operationId: "getCurrentUser",
          summary: "Current user profile",
          security: [{ oauth2: ["profile:read"] }, { bearerAuth: [] }],
          responses: {
            "200": {
              description: "Profile",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      email: { type: "string" },
                      language: { type: "string" },
                      createdAt: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
            ...AUTHED_ERRORS,
          },
        },
      },
      "/v1/trades": {
        get: {
          operationId: "listTrades",
          summary: "List trades",
          security: [{ oauth2: ["trades:read"] }, { bearerAuth: [] }],
          parameters: [
            { name: "accountNumber", in: "query", schema: { type: "string" } },
            { name: "instrument", in: "query", schema: { type: "string" } },
            { name: "side", in: "query", schema: { type: "string" } },
            {
              name: "from",
              in: "query",
              schema: { type: "string", format: "date-time" },
            },
            {
              name: "to",
              in: "query",
              schema: { type: "string", format: "date-time" },
            },
            { name: "cursor", in: "query", schema: { type: "string" } },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 100, maximum: 500 },
            },
          ],
          responses: {
            "200": {
              description: "Paginated trades",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Trade" },
                      },
                      nextCursor: { type: ["string", "null"] },
                    },
                  },
                },
              },
            },
            ...AUTHED_ERRORS,
          },
        },
        post: {
          operationId: "createTrades",
          summary: "Create trades",
          security: [{ oauth2: ["trades:write"] }, { bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["trades"],
                  properties: {
                    trades: {
                      type: "array",
                      items: {
                        type: "object",
                        required: [
                          "accountNumber",
                          "instrument",
                          "quantity",
                          "entryPrice",
                          "closePrice",
                          "entryDate",
                          "closeDate",
                          "pnl",
                        ],
                        properties: {
                          accountNumber: { type: "string" },
                          instrument: { type: "string" },
                          quantity: { type: "number" },
                          entryPrice: { type: ["string", "number"] },
                          closePrice: { type: ["string", "number"] },
                          entryDate: { type: "string" },
                          closeDate: { type: "string" },
                          pnl: { type: "number" },
                          side: { type: "string" },
                          commission: { type: "number" },
                          entryId: { type: "string" },
                          closeId: { type: "string" },
                          timeInPosition: { type: "number" },
                          tags: { type: "array", items: { type: "string" } },
                          comment: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Import counts",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      imported: { type: "integer" },
                      duplicates: { type: "integer" },
                      total: { type: "integer" },
                    },
                  },
                },
              },
            },
            ...AUTHED_ERRORS,
          },
        },
      },
      "/v1/accounts": {
        get: {
          operationId: "listAccounts",
          summary: "List accounts",
          security: [{ oauth2: ["accounts:read"] }, { bearerAuth: [] }],
          parameters: [
            {
              name: "includeMetrics",
              in: "query",
              schema: { type: "boolean" },
            },
          ],
          responses: {
            "200": { description: "Accounts with optional metrics" },
            ...AUTHED_ERRORS,
          },
        },
      },
      "/v1/connections": {
        get: {
          operationId: "listConnections",
          summary: "List connections",
          security: [{ oauth2: ["connections:read"] }, { bearerAuth: [] }],
          responses: {
            "200": { description: "Connections" },
            ...AUTHED_ERRORS,
          },
        },
        post: {
          operationId: "createConnection",
          summary: "Create a connection",
          description:
            "Create an IBKR Flex, DxFeed, or Rithmic Protocol connection. Tradovate " +
            "requires dashboard OAuth and cannot be created here; list and sync it " +
            "after connecting in the dashboard.",
          security: [{ oauth2: ["connections:write"] }, { bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "object",
                      required: ["service", "token", "queryId"],
                      properties: {
                        service: { type: "string", enum: ["ibkr"] },
                        token: {
                          type: "string",
                          description: "IBKR Flex Web Service token",
                        },
                        queryId: {
                          type: "string",
                          description: "IBKR Flex Query ID",
                        },
                      },
                    },
                    {
                      type: "object",
                      required: ["service", "login", "password", "propFirmId"],
                      properties: {
                        service: { type: "string", enum: ["dxfeed"] },
                        login: { type: "string" },
                        password: { type: "string", format: "password" },
                        propFirmId: {
                          type: "string",
                          description:
                            "DxFeed/Volumetrica prop firm id (e.g. miltraders, myfundedfutures)",
                        },
                      },
                    },
                    {
                      type: "object",
                      required: [
                        "service",
                        "username",
                        "password",
                        "systemName",
                        "historyStartDate",
                      ],
                      properties: {
                        service: {
                          type: "string",
                          enum: ["rithmic-protocol"],
                        },
                        username: { type: "string" },
                        password: { type: "string", format: "password" },
                        systemName: { type: "string" },
                        historyStartDate: {
                          type: "string",
                          description:
                            "ISO date (YYYY-MM-DD) for fill history start",
                        },
                        gatewayId: {
                          type: "string",
                          description:
                            "Optional gateway id (e.g. core, nyc, test)",
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Connection created (initial sync attempted)",
            },
            ...AUTHED_ERRORS,
            ...errorRefs("UnprocessableEntity"),
          },
        },
      },
      "/v1/connections/{id}/sync": {
        post: {
          operationId: "syncConnection",
          summary: "Trigger a connection sync",
          description:
            "Supported services: ibkr, dxfeed, rithmic-protocol, and tradovate " +
            "(dashboard-connected).",
          security: [{ oauth2: ["connections:write"] }, { bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Sync completed" },
            ...AUTHED_ERRORS,
            ...errorRefs("UnprocessableEntity"),
          },
        },
      },
      "/v1/imports": {
        post: {
          operationId: "importTradeFile",
          summary: "Import trades from a file",
          security: [{ oauth2: ["imports:write"] }, { bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["file", "type", "accountNumber"],
                  properties: {
                    file: { type: "string", format: "binary" },
                    type: {
                      type: "string",
                      description: "ai | tradezella | topstep | ftmo | tradovate",
                    },
                    accountNumber: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Import counts" },
            ...AUTHED_ERRORS,
            ...errorRefs("UnprocessableEntity"),
          },
        },
      },
      "/v1/metrics/summary": {
        get: {
          operationId: "getMetricsSummary",
          summary: "Aggregate trade metrics",
          security: [{ oauth2: ["metrics:read"] }, { bearerAuth: [] }],
          parameters: [
            { name: "accountNumber", in: "query", schema: { type: "string" } },
            { name: "instrument", in: "query", schema: { type: "string" } },
            { name: "side", in: "query", schema: { type: "string" } },
            { name: "from", in: "query", schema: { type: "string" } },
            { name: "to", in: "query", schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Summary metrics" },
            ...AUTHED_ERRORS,
          },
        },
      },
      "/v1/metrics/equity": {
        get: {
          operationId: "getEquityCurve",
          summary: "Equity curve points",
          security: [{ oauth2: ["metrics:read"] }, { bearerAuth: [] }],
          parameters: [
            { name: "from", in: "query", schema: { type: "string" } },
            { name: "to", in: "query", schema: { type: "string" } },
            { name: "accountNumbers", in: "query", schema: { type: "string" } },
            {
              name: "showIndividual",
              in: "query",
              schema: { type: "boolean" },
            },
          ],
          responses: {
            "200": { description: "Equity series" },
            ...AUTHED_ERRORS,
          },
        },
      },
      "/v1/metrics/accounts": {
        get: {
          operationId: "getAccountMetrics",
          summary: "Per-account metrics",
          security: [{ oauth2: ["metrics:read"] }, { bearerAuth: [] }],
          responses: {
            "200": { description: "Account metrics" },
            ...AUTHED_ERRORS,
          },
        },
      },
    },
    components: {
      securitySchemes: {
        oauth2: {
          type: "oauth2",
          description:
            "Scoped OAuth 2.0 authorization code flow with PKCE (S256). Request the " +
            "narrowest scope set that covers the task; read-only agents should " +
            `request ${READ_ONLY_SCOPES.join(", ")}.`,
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
          bearerFormat: "Opaque",
          description:
            "An OAuth access token, or a personal access token (`dltx_pat_…`) created " +
            "in the Developers dashboard. The token's scopes are enforced per operation.",
        },
      },
      responses: errorResponses,
      schemas: {
        Trade: TRADE_SCHEMA,
        OAuthTokenResponse: {
          type: "object",
          required: ["access_token", "token_type", "expires_in"],
          properties: {
            access_token: { type: "string" },
            token_type: { type: "string", enum: ["Bearer"] },
            expires_in: { type: "integer" },
            refresh_token: { type: "string" },
            scope: { type: "string" },
          },
        },
        OAuthError: {
          type: "object",
          description:
            "RFC 6749 error shape, used only by the /oauth/* endpoints.",
          required: ["error"],
          properties: {
            error: { type: "string" },
            error_description: { type: "string" },
          },
        },
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
