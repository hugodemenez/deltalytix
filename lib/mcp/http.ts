import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import type { NextRequest } from "next/server"
import { authenticateApiRequest, type AuthenticatedApiRequest } from "@/lib/api/auth"
import { jsonError } from "@/lib/api/json-error"
import { mcpToolScopes, MCP_RESOURCE_METADATA_PATH } from "@/lib/mcp/catalog"
import { createDeltalytixMcpServer } from "@/lib/mcp/server"

export const MCP_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Accept, MCP-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "WWW-Authenticate, MCP-Protocol-Version",
  "Access-Control-Max-Age": "86400",
}

export function withMcpCors(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(MCP_CORS_HEADERS)) {
    headers.set(key, value)
  }
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "no-store")
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * Bearer auth for the MCP resource. Personal access tokens and OAuth access
 * tokens both resolve through `authenticateApiRequest`. A missing or revoked
 * token is HTTP 401 with `WWW-Authenticate` pointing at this resource's
 * protected-resource metadata (MCP authorization spec).
 */
export async function authenticateMcpRequest(request: Request) {
  return authenticateApiRequest(request, undefined, {
    resourceMetadataPath: MCP_RESOURCE_METADATA_PATH,
    realm: "mcp",
    scopes: mcpToolScopes(),
  })
}

export function mcpMethodNotAllowed() {
  return jsonError({
    code: "method_not_allowed",
    message: "This MCP server accepts POST.",
    hint: "POST one JSON-RPC message per request with Accept: application/json, text/event-stream and Authorization: Bearer. The server is stateless and answers with application/json.",
    headers: {
      Allow: "POST, OPTIONS",
    },
  })
}

/**
 * Stateless streamable HTTP. A fresh server and transport handle each POST so
 * the route can run on Vercel without an in-memory session. JSON responses
 * (rather than an SSE stream) match that model: the client still speaks
 * streamable HTTP, and the server does not keep a GET stream open.
 */
export async function handleMcpPost(
  request: Request,
  auth: AuthenticatedApiRequest,
): Promise<Response> {
  const server = createDeltalytixMcpServer(auth)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })

  try {
    await server.connect(transport)
    return await transport.handleRequest(request, {
      authInfo: {
        token: auth.tokenId,
        clientId: auth.clientId ?? "personal-access-token",
        scopes: auth.scopes,
        extra: {
          userId: auth.userId,
          tokenId: auth.tokenId,
          appId: auth.appId,
        },
      },
    })
  } finally {
    await Promise.allSettled([transport.close(), server.close()])
  }
}

export function mcpOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      ...MCP_CORS_HEADERS,
      "Cache-Control": "no-store",
    },
  })
}

export type McpRouteResult = Response

export async function dispatchMcp(request: NextRequest): Promise<Response> {
  if (request.method === "OPTIONS") return mcpOptionsResponse()

  const auth = await authenticateMcpRequest(request)
  if (!auth.ok) return withMcpCors(auth.response)

  if (request.method !== "POST") {
    return withMcpCors(mcpMethodNotAllowed())
  }

  return withMcpCors(await handleMcpPost(request, auth.auth))
}
