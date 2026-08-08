import type { NextRequest } from "next/server"
import { absoluteUrl, FIRST_PARTY_API_SCOPES } from "@/lib/agent-discovery/metadata"
import { API_SCOPE_DESCRIPTIONS } from "@/lib/api/scopes"

export function buildOpenApiDocument(request?: NextRequest) {
  const origin = absoluteUrl("/", request).replace(/\/$/, "")
  const scopeMap = Object.fromEntries(
    FIRST_PARTY_API_SCOPES.map((scope) => [
      scope,
      API_SCOPE_DESCRIPTIONS[scope],
    ]),
  )

  const errorSchema = {
    type: "object",
    required: ["error", "message"],
    properties: {
      error: { type: "string" },
      message: { type: "string" },
      details: {},
    },
  }

  const tradeSchema = {
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
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Deltalytix Public API",
      version: "1.0.0",
      description:
        "OAuth 2.0 protected REST API for trades, accounts, connections, imports, and metrics.",
    },
    servers: [{ url: origin }],
    components: {
      securitySchemes: {
        oauth2: {
          type: "oauth2",
          flows: {
            authorizationCode: {
              authorizationUrl: `${origin}/oauth/authorize`,
              tokenUrl: `${origin}/api/oauth/token`,
              refreshUrl: `${origin}/api/oauth/token`,
              scopes: scopeMap,
            },
          },
        },
        bearerPat: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "PAT",
          description: "Personal access token (dltx_pat_…)",
        },
      },
      schemas: {
        Error: errorSchema,
        Trade: tradeSchema,
        OAuthTokenResponse: {
          type: "object",
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
          properties: {
            error: { type: "string" },
            error_description: { type: "string" },
          },
        },
      },
    },
    security: [{ oauth2: [] }, { bearerPat: [] }],
    paths: {
      "/api/oauth/token": {
        post: {
          summary: "Exchange authorization code or refresh token",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/x-www-form-urlencoded": {
                schema: {
                  type: "object",
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
          },
        },
      },
      "/api/oauth/revoke": {
        post: {
          summary: "Revoke an access or refresh token",
          security: [],
          responses: {
            "200": { description: "Always succeeds" },
          },
        },
      },
      "/api/v1/me": {
        get: {
          summary: "Current user profile",
          security: [{ oauth2: ["profile:read"] }, { bearerPat: [] }],
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
                      createdAt: { type: "string" },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/api/v1/trades": {
        get: {
          summary: "List trades",
          security: [{ oauth2: ["trades:read"] }, { bearerPat: [] }],
          parameters: [
            { name: "accountNumber", in: "query", schema: { type: "string" } },
            { name: "instrument", in: "query", schema: { type: "string" } },
            { name: "side", in: "query", schema: { type: "string" } },
            { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "cursor", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 100, maximum: 500 } },
          ],
          responses: {
            "200": {
              description: "Paginated trades",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Trade" } },
                      nextCursor: { type: ["string", "null"] },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: "Create trades",
          security: [{ oauth2: ["trades:write"] }, { bearerPat: [] }],
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
                      error: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/accounts": {
        get: {
          summary: "List accounts",
          security: [{ oauth2: ["accounts:read"] }, { bearerPat: [] }],
          parameters: [
            {
              name: "includeMetrics",
              in: "query",
              schema: { type: "boolean" },
            },
          ],
          responses: {
            "200": { description: "Accounts with optional metrics" },
          },
        },
      },
      "/api/v1/connections": {
        get: {
          summary: "List connections",
          security: [{ oauth2: ["connections:read"] }, { bearerPat: [] }],
          responses: { "200": { description: "Connections" } },
        },
        post: {
          summary: "Create a connection (IBKR Flex)",
          security: [{ oauth2: ["connections:write"] }, { bearerPat: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["service", "token", "queryId"],
                  properties: {
                    service: { type: "string", enum: ["ibkr"] },
                    token: { type: "string" },
                    queryId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Connection created" },
            "422": { description: "Unsupported service" },
          },
        },
      },
      "/api/v1/connections/{id}/sync": {
        post: {
          summary: "Trigger a connection sync",
          security: [{ oauth2: ["connections:write"] }, { bearerPat: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Sync completed" },
          },
        },
      },
      "/api/v1/imports": {
        post: {
          summary: "Import trades from a file",
          security: [{ oauth2: ["imports:write"] }, { bearerPat: [] }],
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
            "422": { description: "Unsupported platform" },
          },
        },
      },
      "/api/v1/metrics/summary": {
        get: {
          summary: "Aggregate trade metrics",
          security: [{ oauth2: ["metrics:read"] }, { bearerPat: [] }],
          parameters: [
            { name: "accountNumber", in: "query", schema: { type: "string" } },
            { name: "instrument", in: "query", schema: { type: "string" } },
            { name: "side", in: "query", schema: { type: "string" } },
            { name: "from", in: "query", schema: { type: "string" } },
            { name: "to", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Summary metrics" } },
        },
      },
      "/api/v1/metrics/equity": {
        get: {
          summary: "Equity curve points",
          security: [{ oauth2: ["metrics:read"] }, { bearerPat: [] }],
          parameters: [
            { name: "from", in: "query", schema: { type: "string" } },
            { name: "to", in: "query", schema: { type: "string" } },
            { name: "accountNumbers", in: "query", schema: { type: "string" } },
            { name: "showIndividual", in: "query", schema: { type: "boolean" } },
          ],
          responses: { "200": { description: "Equity series" } },
        },
      },
      "/api/v1/metrics/accounts": {
        get: {
          summary: "Per-account metrics",
          security: [{ oauth2: ["metrics:read"] }, { bearerPat: [] }],
          responses: { "200": { description: "Account metrics" } },
        },
      },
    },
  }
}
