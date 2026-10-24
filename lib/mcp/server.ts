import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"
import { hasRequiredScopes } from "@/lib/api/scopes"
import type { AuthenticatedApiRequest } from "@/lib/api/auth"
import { decodeCursor, encodeCursor } from "@/lib/api/pagination"
import {
  readAccountMetrics,
  readAccounts,
  readConnections,
  readEquity,
  readMetricsSummary,
  readProfile,
  readTrades,
} from "@/lib/api/v1/reads"
import {
  MCP_SERIES_DEFAULT_LIMIT,
  MCP_SERIES_MAX_LIMIT,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  MCP_TOOLS,
  type McpToolName,
} from "@/lib/mcp/catalog"

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const

function toolError(message: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  }
}

function toolJson(payload: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
  }
}

function blank(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function requireScope(
  auth: AuthenticatedApiRequest,
  scope: string,
): CallToolResult | null {
  if (hasRequiredScopes(auth.scopes, [scope])) return null
  return toolError(
    `This token is missing the ${scope} scope. Create or re-authorize a token that includes it, then retry. No data was read.`,
  )
}

function pageSeries<T>(
  items: T[],
  limit: number | undefined,
  cursor: string | undefined,
) {
  const pageSize = Math.min(
    Math.max(limit ?? MCP_SERIES_DEFAULT_LIMIT, 1),
    MCP_SERIES_MAX_LIMIT,
  )
  const offset = decodeCursor(cursor ?? null)
  const page = items.slice(offset, offset + pageSize)
  return {
    data: page,
    nextCursor: offset + pageSize < items.length ? encodeCursor(offset + pageSize) : null,
  }
}

const tradeFilters = {
  accountNumber: z
    .string()
    .optional()
    .describe("Account number to keep. Omit to include every account the token can read."),
  instrument: z.string().optional().describe("Instrument symbol, for example ES or NQ."),
  side: z
    .string()
    .optional()
    .describe("Trade side. Use long or short. Omit to include both."),
  from: z
    .string()
    .optional()
    .describe("Inclusive ISO 8601 lower bound on entryDate. A date (YYYY-MM-DD) starts at 00:00:00Z."),
  to: z
    .string()
    .optional()
    .describe("Inclusive ISO 8601 upper bound on entryDate. A date (YYYY-MM-DD) runs through the end of that UTC day."),
}

const seriesFilters = {
  from: tradeFilters.from,
  to: tradeFilters.to,
  accountNumbers: z
    .array(z.string())
    .max(50)
    .optional()
    .describe("Account numbers to include. Omit for the combined series."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MCP_SERIES_MAX_LIMIT)
    .optional()
    .describe(
      `Maximum points to return. Defaults to ${MCP_SERIES_DEFAULT_LIMIT}. Cannot exceed ${MCP_SERIES_MAX_LIMIT}.`,
    ),
  cursor: z
    .string()
    .optional()
    .describe("Pagination cursor from the previous response's nextCursor."),
}

function definition(name: McpToolName) {
  const tool = MCP_TOOLS.find((entry) => entry.name === name)
  if (!tool) throw new Error(`Unknown MCP tool ${name}`)
  return tool
}

export function createDeltalytixMcpServer(auth: AuthenticatedApiRequest) {
  const server = new McpServer(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    { capabilities: { tools: { listChanged: false } } },
  )

  const profile = definition("get_profile")
  server.registerTool(
    profile.name,
    {
      title: profile.title,
      description: profile.description,
      inputSchema: z.object({}).strict(),
      annotations: { ...annotations, title: profile.title },
    },
    async () => {
      const denied = requireScope(auth, profile.scope)
      if (denied) return denied
      const user = await readProfile(auth.userId)
      if (!user) {
        return toolError("No profile was found for this token.")
      }
      return toolJson(user)
    },
  )

  const accounts = definition("list_accounts")
  server.registerTool(
    accounts.name,
    {
      title: accounts.title,
      description: accounts.description,
      inputSchema: z
        .object({
          includeMetrics: z
            .boolean()
            .optional()
            .describe(
              "When true, attach balance, drawdown, consistency, and progress for each account.",
            ),
        })
        .strict(),
      annotations: { ...annotations, title: accounts.title },
    },
    async ({ includeMetrics }) => {
      const denied = requireScope(auth, accounts.scope)
      if (denied) return denied
      return toolJson(
        await readAccounts(auth.userId, { includeMetrics: includeMetrics === true }),
      )
    },
  )

  const trades = definition("list_trades")
  server.registerTool(
    trades.name,
    {
      title: trades.title,
      description: trades.description,
      inputSchema: z
        .object({
          ...tradeFilters,
          limit: z
            .number()
            .int()
            .min(1)
            .max(500)
            .optional()
            .describe("Page size. Defaults to 100. Cannot exceed 500."),
          cursor: z
            .string()
            .optional()
            .describe("Pagination cursor from the previous response's nextCursor."),
        })
        .strict(),
      annotations: { ...annotations, title: trades.title },
    },
    async (args) => {
      const denied = requireScope(auth, trades.scope)
      if (denied) return denied
      const result = await readTrades(auth.userId, {
        accountNumber: blank(args.accountNumber),
        instrument: blank(args.instrument),
        side: blank(args.side),
        from: blank(args.from),
        to: blank(args.to),
        limit: args.limit,
        cursor: blank(args.cursor),
      })
      if (!result.ok) return toolError(result.message)
      return toolJson(result.data)
    },
  )

  const summary = definition("get_metrics_summary")
  server.registerTool(
    summary.name,
    {
      title: summary.title,
      description: summary.description,
      inputSchema: z.object(tradeFilters).strict(),
      annotations: { ...annotations, title: summary.title },
    },
    async (args) => {
      const denied = requireScope(auth, summary.scope)
      if (denied) return denied
      const result = await readMetricsSummary(auth.userId, {
        accountNumber: blank(args.accountNumber),
        instrument: blank(args.instrument),
        side: blank(args.side),
        from: blank(args.from),
        to: blank(args.to),
      })
      if (!result.ok) return toolError(result.message)
      return toolJson(result.data)
    },
  )

  const accountMetrics = definition("get_account_metrics")
  server.registerTool(
    accountMetrics.name,
    {
      title: accountMetrics.title,
      description: accountMetrics.description,
      inputSchema: z.object({}).strict(),
      annotations: { ...annotations, title: accountMetrics.title },
    },
    async () => {
      const denied = requireScope(auth, accountMetrics.scope)
      if (denied) return denied
      return toolJson(await readAccountMetrics(auth.userId))
    },
  )

  const equity = definition("get_equity_curve")
  server.registerTool(
    equity.name,
    {
      title: equity.title,
      description: equity.description,
      inputSchema: z
        .object({
          ...seriesFilters,
          showIndividual: z
            .boolean()
            .optional()
            .describe("When true, include a series per account (at most 8)."),
        })
        .strict(),
      annotations: { ...annotations, title: equity.title },
    },
    async (args) => {
      const denied = requireScope(auth, equity.scope)
      if (denied) return denied
      const from = blank(args.from)
      const to = blank(args.to)
      const dateProblem = invalidSeriesDates(from, to)
      if (dateProblem) return toolError(dateProblem)
      const series = await readEquity(auth.userId, {
        from,
        to,
        accountNumbers: args.accountNumbers?.map((value) => value.trim()).filter(Boolean),
        showIndividual: args.showIndividual === true,
      })
      const page = pageSeries(series.data, args.limit, blank(args.cursor))
      return toolJson({
        ...page,
        accountNumbers: series.accountNumbers,
        dateRange: series.dateRange,
      })
    },
  )

  const daily = definition("get_daily_pnl")
  server.registerTool(
    daily.name,
    {
      title: daily.title,
      description: daily.description,
      inputSchema: z.object(seriesFilters).strict(),
      annotations: { ...annotations, title: daily.title },
    },
    async (args) => {
      const denied = requireScope(auth, daily.scope)
      if (denied) return denied
      const from = blank(args.from)
      const to = blank(args.to)
      const dateProblem = invalidSeriesDates(from, to)
      if (dateProblem) return toolError(dateProblem)
      const series = await readEquity(auth.userId, {
        from,
        to,
        accountNumbers: args.accountNumbers?.map((value) => value.trim()).filter(Boolean),
      })
      const points = series.data.map((point) => ({
        date: point.date,
        dailyPnL: point.dailyPnL ?? null,
        netPnL: point.netPnL ?? null,
        equity: point.equity ?? null,
        dailyCommissions: point.dailyCommissions ?? null,
      }))
      const page = pageSeries(points, args.limit, blank(args.cursor))
      return toolJson({
        ...page,
        accountNumbers: series.accountNumbers,
        dateRange: series.dateRange,
      })
    },
  )

  const connections = definition("list_connections")
  server.registerTool(
    connections.name,
    {
      title: connections.title,
      description: connections.description,
      inputSchema: z.object({}).strict(),
      annotations: { ...annotations, title: connections.title },
    },
    async () => {
      const denied = requireScope(auth, connections.scope)
      if (denied) return denied
      return toolJson(await readConnections(auth.userId))
    },
  )

  return server
}

function invalidSeriesDates(from?: string, to?: string): string | null {
  for (const [name, value] of [
    ["from", from],
    ["to", to],
  ] as const) {
    if (!value) continue
    if (Number.isNaN(new Date(value).getTime())) {
      return `${name} must be an ISO 8601 date`
    }
  }
  return null
}
