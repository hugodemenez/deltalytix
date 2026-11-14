import { z } from "zod"
import {
  MCP_SERIES_DEFAULT_LIMIT,
  MCP_SERIES_MAX_LIMIT,
  type McpToolName,
} from "@/lib/mcp/catalog"

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
    .describe(
      "Inclusive ISO 8601 lower bound on entryDate. A date (YYYY-MM-DD) starts at 00:00:00Z.",
    ),
  to: z
    .string()
    .optional()
    .describe(
      "Inclusive ISO 8601 upper bound on entryDate. A date (YYYY-MM-DD) runs through the end of that UTC day.",
    ),
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

/** Zod input schemas for every authenticated MCP tool, keyed by tool name. */
export const MCP_TOOL_INPUT_SCHEMAS = {
  get_profile: z.object({}).strict(),
  list_accounts: z
    .object({
      includeMetrics: z
        .boolean()
        .optional()
        .describe(
          "When true, attach balance, drawdown, consistency, and progress for each account.",
        ),
    })
    .strict(),
  list_trades: z
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
  get_metrics_summary: z.object(tradeFilters).strict(),
  get_account_metrics: z.object({}).strict(),
  get_equity_curve: z
    .object({
      ...seriesFilters,
      showIndividual: z
        .boolean()
        .optional()
        .describe("When true, include a series per account (at most 8)."),
    })
    .strict(),
  get_daily_pnl: z.object(seriesFilters).strict(),
  list_connections: z.object({}).strict(),
} as const satisfies Record<McpToolName, z.ZodTypeAny>

export function mcpToolInputKeys(name: McpToolName): string[] {
  const shape = MCP_TOOL_INPUT_SCHEMAS[name]
  if (!(shape instanceof z.ZodObject)) return []
  return Object.keys(shape.shape)
}
