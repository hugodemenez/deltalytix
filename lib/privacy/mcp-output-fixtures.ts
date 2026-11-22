import { serializeTrade } from "@/lib/api/pagination"
import { computeEquityChartData } from "@/lib/equity-chart"
import type { McpToolName } from "@/lib/mcp/catalog"

const DYNAMIC_EQUITY_PREFIXES = [
  "reset_",
  "payout_",
  "payoutStatus_",
  "payoutAmount_",
  "equity_",
] as const

function collectKeys(value: unknown, into: Set<string> = new Set()): Set<string> {
  if (!value || typeof value !== "object") return into
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, into)
    return into
  }
  for (const [key, nested] of Object.entries(value)) {
    into.add(key)
    collectKeys(nested, into)
  }
  return into
}

/** Normalize dynamic `_<account>` keys to their disclosed prefixes. */
export function normalizeOutputKey(key: string): string {
  for (const prefix of DYNAMIC_EQUITY_PREFIXES) {
    if (key.startsWith(prefix) && key.length > prefix.length) return prefix
  }
  return key
}

function fixtureTrade() {
  return serializeTrade({
    id: "t1",
    accountNumber: "ACC1",
    instrument: "ES",
    side: "long",
    quantity: 1,
    entryPrice: "5000",
    closePrice: "5010",
    entryDate: "2026-01-02T15:00:00.000Z",
    closeDate: "2026-01-02T16:00:00.000Z",
    pnl: 50,
    commission: 2,
    timeInPosition: 3600,
    tags: ["a"],
    comment: "note",
    createdAt: new Date("2026-01-02T16:00:00.000Z"),
  })
}

function fixtureEquityResponse() {
  const account = "ACC1"
  const result = computeEquityChartData(
    [
      {
        accountNumber: account,
        entryDate: "2026-01-02T15:00:00.000Z",
        pnl: 50,
        commission: 2,
        instrument: "ES",
        timeInPosition: 3600,
        tags: ["a"],
      },
    ],
    [
      {
        number: account,
        groupId: null,
        startingBalance: 50_000,
        resetDate: new Date("2026-01-01T00:00:00.000Z"),
        payouts: [
          {
            date: new Date("2026-01-03T00:00:00.000Z"),
            amount: 100,
            status: "PAID",
          },
        ],
      },
    ],
    [],
    {
      instruments: [],
      accountNumbers: [account],
      pnlRange: {},
      tickRange: {},
      timeRange: { range: null },
      tickFilter: { value: null },
      weekdayFilter: { days: [] },
      hourFilter: { hour: null },
      tagFilter: { tags: [] },
      timezone: "UTC",
      showIndividual: true,
      maxAccounts: 8,
      dataSampling: "all",
      selectedAccounts: [account],
    },
  )

  // Merge every daily point so dynamic payout/reset/equity_<account> keys
  // from any day appear in the fixture key set.
  const merged: Record<string, unknown> = {
    dateRange: result.dateRange,
    accountNumbers: result.accountNumbers,
    nextCursor: null,
  }
  for (const point of result.chartData) {
    Object.assign(merged, point)
  }
  return merged
}

/**
 * Build sample MCP tool payloads from real serializers / equity chart code
 * (not hand-maintained key lists).
 */
export function buildMcpOutputFixtures(): Record<McpToolName, Record<string, unknown>> {
  const trade = fixtureTrade()
  const equity = fixtureEquityResponse()

  return {
    get_profile: { id: "u1", email: "a@b.c", language: "en" },
    list_accounts: {
      id: "a1",
      number: "ACC1",
      propfirm: "Demo Firm",
      startingBalance: 50_000,
      createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      hidden: false,
      group: { id: "g1", name: "Main" },
      payouts: [
        {
          id: "p1",
          amount: 100,
          date: new Date("2026-01-03T00:00:00.000Z").toISOString(),
          status: "PAID",
        },
      ],
    },
    list_trades: trade,
    get_metrics_summary: {
      totalPnl: 48,
      totalCommission: 2,
      tradeCount: 1,
      winCount: 1,
      lossCount: 0,
      breakevenCount: 0,
      winRate: 1,
      profitFactor: null,
      averageWin: 48,
      averageLoss: 0,
      longCount: 1,
      shortCount: 0,
      tradingDays: 1,
    },
    get_account_metrics: {
      id: "a1",
      number: "ACC1",
      balance: 50_048,
      drawdown: null,
      consistency: null,
      progress: null,
      metrics: null,
    },
    get_equity_curve: equity,
    get_daily_pnl: {
      date: equity.date,
      dailyPnL: equity.dailyPnL ?? null,
      netPnL: equity.netPnL ?? null,
      equity: equity.equity ?? null,
      dailyCommissions: equity.dailyCommissions ?? null,
      accountNumbers: equity.accountNumbers,
      dateRange: equity.dateRange,
      nextCursor: null,
    },
    list_connections: {
      id: "c1",
      service: "tradovate",
      externalId: "broker-user-9",
      lastSyncedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      environment: "live",
      accountNumbers: ["ACC1"],
      createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    },
  }
}

export function fixtureOutputKeys(tool: McpToolName): string[] {
  return [...collectKeys(buildMcpOutputFixtures()[tool])]
}
