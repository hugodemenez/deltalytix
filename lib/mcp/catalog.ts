import type { ApiScope } from "@/lib/api/scopes"

/** Streamable HTTP endpoint. Stateless: one JSON-RPC message per POST. */
export const MCP_PATH = "/api/mcp"

/**
 * RFC 9728 path insertion for a resource at `/api/mcp`:
 * `/.well-known/oauth-protected-resource` + `/api/mcp`.
 */
export const MCP_RESOURCE_METADATA_PATH =
  "/.well-known/oauth-protected-resource/api/mcp"

export const OAUTH_AUTHORIZATION_SERVER_PATH =
  "/.well-known/oauth-authorization-server"

export const MCP_SERVER_NAME = "Deltalytix"
export const MCP_SERVER_VERSION = "1.0.0"

/** Default page of daily equity points. A trading year fits; agents can cursor forward. */
export const MCP_SERIES_DEFAULT_LIMIT = 366
export const MCP_SERIES_MAX_LIMIT = 1000

export type McpToolDefinition = {
  name: string
  title: string
  scope: ApiScope
  description: string
}

/**
 * Read-only tools. Each one calls the same server function as the matching
 * `GET /api/v1` route and is scoped to the bearer token's user. Write tools
 * are intentionally absent: see the API docs.
 */
export const MCP_TOOLS = [
  {
    name: "get_profile",
    title: "Get profile",
    scope: "profile:read",
    description:
      "Read the authenticated user's profile: id, email, and language. The user is taken from the bearer token. Requires the profile:read scope. Does not accept a user id.",
  },
  {
    name: "list_accounts",
    title: "List accounts",
    scope: "accounts:read",
    description:
      "List the authenticated user's trading accounts, payouts, hidden flag, and group. Set includeMetrics to true to attach balance, drawdown, consistency, and progress — the same payload as GET /api/v1/accounts. Requires accounts:read. Limited to the token's user.",
  },
  {
    name: "list_trades",
    title: "List trades",
    scope: "trades:read",
    description:
      "List the authenticated user's trades, newest entry date first. Filter by accountNumber, instrument, side (long or short), and an inclusive ISO 8601 entryDate range (from/to). Paginate with limit (default 100, maximum 500) and cursor. Same filters and ordering as GET /api/v1/trades. Requires trades:read. The user id comes from the token, never from the arguments.",
  },
  {
    name: "get_metrics_summary",
    title: "Get metrics summary",
    scope: "metrics:read",
    description:
      "Performance summary for the authenticated user: net PnL, commissions, win rate, profit factor, average win and loss, long and short counts, and trading days. Same filters as list_trades and the same calculation as GET /api/v1/metrics/summary. Requires metrics:read.",
  },
  {
    name: "get_account_metrics",
    title: "Get account metrics",
    scope: "metrics:read",
    description:
      "Per-account balance, drawdown, consistency, progress, and metrics for the authenticated user. Same payload as GET /api/v1/metrics/accounts. Requires metrics:read.",
  },
  {
    name: "get_equity_curve",
    title: "Get equity curve",
    scope: "metrics:read",
    description:
      "Daily equity series for the authenticated user from GET /api/v1/metrics/equity, including dailyPnL, netPnL, and equity. Optional from/to ISO 8601 bounds and accountNumbers. Paginated: limit defaults to 366 and cannot exceed 1000; pass cursor for the next page. Requires metrics:read.",
  },
  {
    name: "get_daily_pnl",
    title: "Get daily PnL",
    scope: "metrics:read",
    description:
      "Daily profit and loss for the authenticated user, projected from the equity series: date, dailyPnL, netPnL, equity, and dailyCommissions. Same date and account filters as get_equity_curve. Paginated: limit defaults to 366 and cannot exceed 1000; pass cursor for the next page. Requires metrics:read.",
  },
  {
    name: "list_connections",
    title: "List connections",
    scope: "connections:read",
    description:
      "List the authenticated user's broker connections: service, environment, last sync time, and linked account numbers. Same payload as GET /api/v1/connections. Requires connections:read. Broker tokens and secrets are never returned.",
  },
] as const satisfies readonly McpToolDefinition[]

export type McpToolName = (typeof MCP_TOOLS)[number]["name"]

export function mcpToolScopes(): ApiScope[] {
  return [...new Set(MCP_TOOLS.map((tool) => tool.scope))]
}
