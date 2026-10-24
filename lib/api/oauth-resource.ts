import { MCP_PATH } from "@/lib/mcp/catalog"

/** Canonical audience for tokens that are bound to the MCP server. */
export function canonicalMcpResource(issuer: string): string {
  return `${issuer.replace(/\/$/, "")}${MCP_PATH}`
}

/**
 * RFC 8707 resource indicator. Only the MCP server is an audience this
 * authorization server will bind. Anything else is `invalid_target`.
 */
export function resourceIndicatorProblem(
  resource: string,
  issuer: string,
): string | null {
  let url: URL
  try {
    url = new URL(resource)
  } catch {
    return "resource must be an absolute URI"
  }
  if (url.hash || url.search || url.username || url.password) {
    return "resource must not include a query, fragment, or credentials"
  }
  let issuerUrl: URL
  try {
    issuerUrl = new URL(issuer)
  } catch {
    return "resource must use this authorization server's origin"
  }
  if (url.origin !== issuerUrl.origin) {
    return "resource must use this authorization server's origin"
  }
  if ((url.pathname.replace(/\/$/, "") || "/") !== MCP_PATH) {
    return "resource must be the MCP server"
  }
  return null
}

function audienceIdentity(value: string): string {
  const url = new URL(value)
  const path = url.pathname.replace(/\/$/, "") || "/"
  return `${url.origin}${path}`
}

/**
 * A bound token may be used only on the resource it was issued for.
 * Scheme, host, port, and path all have to match. A trailing slash on the
 * path does not make a different audience.
 */
export function audienceMatchesRequest(resource: string, request: Request): boolean {
  try {
    return audienceIdentity(resource) === audienceIdentity(request.url)
  } catch {
    return false
  }
}
