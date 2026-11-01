import type { NextRequest } from "next/server"
import { absoluteUrl, getOAuthIssuer } from "@/lib/agent-discovery/metadata"
import { MCP_PATH, MCP_SERVER_NAME, mcpToolScopes } from "@/lib/mcp/catalog"

/**
 * RFC 9728 protected-resource metadata for the MCP server. `resource` is the
 * streamable HTTP endpoint the client is connecting to, and
 * `authorization_servers` points at Deltalytix's own issuer.
 */
export function buildMcpProtectedResourceMetadata(
  request?: NextRequest | Request,
) {
  return {
    resource: absoluteUrl(MCP_PATH, request),
    authorization_servers: [getOAuthIssuer(request)],
    scopes_supported: mcpToolScopes(),
    bearer_methods_supported: ["header"],
    resource_name: MCP_SERVER_NAME,
    resource_documentation: absoluteUrl("/docs/api", request),
  }
}
