import { computeMetricsForAccounts } from "@/lib/account-metrics"
import { HIDDEN_GROUP_NAME } from "@/lib/account-groups"
import {
  buildTradeWhere,
  decodeCursor,
  encodeCursor,
  filterAndSortTradesByEntryDate,
  invalidDateFilter,
  parseLimit,
  serializeTrade,
  computeProfitFactor,
  type TradeListFilters,
} from "@/lib/api/pagination"
import { computeEquityChartData } from "@/lib/equity-chart"
import { prisma } from "@/lib/prisma"
import { getConnectionsForUser } from "@/server/connections"
import { calculateStatistics, calculateTradingDays } from "@/lib/utils"
import type { Account } from "@/context/data-provider"
import type { Trade } from "@/prisma/generated/prisma/client"

export type ReadFailure = { ok: false; message: string }
export type ReadSuccess<T> = { ok: true; data: T }
export type ReadResult<T> = ReadSuccess<T> | ReadFailure

export type TradeReadQuery = TradeListFilters & {
  limit?: number | string | null
  cursor?: string | null
}

function dateError(from?: string, to?: string): string | null {
  const params = new URLSearchParams()
  if (from) params.set("from", from)
  if (to) params.set("to", to)
  const bad = invalidDateFilter(params)
  return bad ? `${bad} must be an ISO 8601 date` : null
}

function requireUserId(userId: string): string {
  const id = userId.trim()
  if (!id) {
    throw new Error("A read requires the authenticated user id")
  }
  return id
}

function limitFrom(value: number | string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return parseLimit(String(Math.trunc(value)))
  }
  if (typeof value === "string") return parseLimit(value)
  return parseLimit(null)
}

export async function readProfile(userId: string) {
  // Tokens store `User.id` (see resolveDbUserId). Matching auth_user_id as
  // well could return a different person when the two identifiers collide.
  const user = await prisma.user.findFirst({
    where: { id: requireUserId(userId) },
    select: {
      id: true,
      email: true,
      language: true,
    },
  })

  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    language: user.language,
  }
}

export async function readAccounts(
  userId: string,
  options: { includeMetrics?: boolean } = {},
) {
  const ownerId = requireUserId(userId)
  const accounts = await prisma.account.findMany({
    where: { userId: ownerId },
    include: {
      group: { select: { id: true, name: true, userId: true } },
      payouts: {
        select: {
          id: true,
          amount: true,
          date: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  const groupFields = new Map(
    accounts.map((account) => {
      const group =
        account.group && account.group.userId === ownerId ? account.group : null
      return [
        account.id,
        {
          hidden: group?.name === HIDDEN_GROUP_NAME,
          group: group ? { id: group.id, name: group.name } : null,
        },
      ] as const
    }),
  )

  if (!options.includeMetrics) {
    return {
      data: accounts.map((account) => ({
        id: account.id,
        number: account.number,
        propfirm: account.propfirm,
        startingBalance: account.startingBalance,
        createdAt: account.createdAt.toISOString(),
        ...groupFields.get(account.id),
        payouts: account.payouts.map((payout) => ({
          id: payout.id,
          amount: payout.amount,
          date: payout.date.toISOString(),
          status: payout.status,
        })),
      })),
    }
  }

  const trades = await prisma.trade.findMany({
    where: { userId: ownerId },
  })

  const withMetrics = computeMetricsForAccounts(
    accounts as unknown as Account[],
    trades,
  )

  return {
    data: withMetrics.map((account) => ({
      id: account.id,
      number: account.number,
      propfirm: account.propfirm,
      startingBalance: account.startingBalance,
      createdAt: account.createdAt.toISOString(),
      ...groupFields.get(account.id),
      balance: account.balanceToDate,
      drawdown: account.metrics?.drawdownProgress ?? null,
      consistency: account.metrics?.isConsistent ?? null,
      progress: account.metrics?.progress ?? null,
      metrics: account.metrics ?? null,
      payouts: (account.payouts || []).map((payout) => ({
        id: payout.id,
        amount: payout.amount,
        date: new Date(payout.date).toISOString(),
        status: payout.status,
      })),
    })),
  }
}

export async function readTrades(
  userId: string,
  query: TradeReadQuery,
): Promise<
  ReadResult<{ data: ReturnType<typeof serializeTrade>[]; nextCursor: string | null }>
> {
  const ownerId = requireUserId(userId)
  const dateProblem = dateError(query.from, query.to)
  if (dateProblem) return { ok: false, message: dateProblem }

  const limit = limitFrom(query.limit)
  const offset = decodeCursor(query.cursor ?? null)
  const where = buildTradeWhere(ownerId, {
    accountNumber: query.accountNumber,
    instrument: query.instrument,
    side: query.side,
  })

  const trades = filterAndSortTradesByEntryDate(
    await prisma.trade.findMany({ where }),
    { from: query.from, to: query.to },
  )

  const page = trades.slice(offset, offset + limit)
  const hasMore = offset + limit < trades.length

  return {
    ok: true,
    data: {
      data: page.map(serializeTrade),
      nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    },
  }
}

export async function readMetricsSummary(
  userId: string,
  query: TradeListFilters,
): Promise<
  ReadResult<{
    totalPnl: number
    totalCommission: number
    tradeCount: number
    winCount: number
    lossCount: number
    breakevenCount: number
    winRate: number
    profitFactor: number | null
    averageWin: number
    averageLoss: number
    longCount: number
    shortCount: number
    tradingDays: number
  }>
> {
  const ownerId = requireUserId(userId)
  const dateProblem = dateError(query.from, query.to)
  if (dateProblem) return { ok: false, message: dateProblem }

  const where = buildTradeWhere(ownerId, {
    accountNumber: query.accountNumber,
    instrument: query.instrument,
    side: query.side,
  })

  const trades = filterAndSortTradesByEntryDate(
    (await prisma.trade.findMany({ where })) as Trade[],
    { from: query.from, to: query.to },
  )
  const stats = calculateStatistics(trades)
  const tradingDays = calculateTradingDays(trades)
  const profitFactor = computeProfitFactor(trades)

  const wins = trades.filter((trade) => trade.pnl - trade.commission > 0)
  const losses = trades.filter((trade) => trade.pnl - trade.commission < 0)
  const averageWin =
    wins.length > 0
      ? wins.reduce((sum, trade) => sum + (trade.pnl - trade.commission), 0) /
        wins.length
      : 0
  const averageLoss =
    losses.length > 0
      ? Math.abs(
          losses.reduce((sum, trade) => sum + (trade.pnl - trade.commission), 0) /
            losses.length,
        )
      : 0

  return {
    ok: true,
    data: {
      totalPnl: stats.cumulativePnl,
      totalCommission: stats.cumulativeFees,
      tradeCount: stats.nbTrades,
      winCount: stats.nbWin,
      lossCount: stats.nbLoss,
      breakevenCount: stats.nbBe,
      winRate: stats.winRate,
      profitFactor: Number.isFinite(profitFactor) ? profitFactor : null,
      averageWin,
      averageLoss,
      longCount: trades.filter((trade) => (trade.side || "").toLowerCase() === "long")
        .length,
      shortCount: trades.filter(
        (trade) => (trade.side || "").toLowerCase() === "short",
      ).length,
      tradingDays: tradingDays.totalTradingDays,
    },
  }
}

export async function readAccountMetrics(userId: string) {
  const ownerId = requireUserId(userId)
  const [accounts, trades] = await Promise.all([
    prisma.account.findMany({
      where: { userId: ownerId },
      include: { payouts: true },
    }),
    prisma.trade.findMany({ where: { userId: ownerId } }),
  ])

  const withMetrics = computeMetricsForAccounts(
    accounts as unknown as Account[],
    trades,
  )

  return {
    data: withMetrics.map((account) => ({
      id: account.id,
      number: account.number,
      balance: account.balanceToDate,
      drawdown: account.metrics?.drawdownProgress ?? null,
      consistency: account.metrics?.isConsistent ?? null,
      progress: account.metrics?.progress ?? null,
      metrics: account.metrics ?? null,
    })),
  }
}

export type EquityReadQuery = {
  from?: string
  to?: string
  accountNumbers?: string[]
  showIndividual?: boolean
}

const emptyEquity = {
  data: [] as ReturnType<typeof computeEquityChartData>["chartData"],
  accountNumbers: [] as string[],
  dateRange: { startDate: "", endDate: "" },
}

export async function readEquity(userId: string, query: EquityReadQuery = {}) {
  const ownerId = requireUserId(userId)
  const from = query.from
  const to = query.to
  const requested = (query.accountNumbers ?? []).map((value) => value.trim()).filter(Boolean)
  const showIndividual = query.showIndividual === true

  const [allTrades, accounts, groups] = await Promise.all([
    prisma.trade.findMany({ where: { userId: ownerId } }),
    prisma.account.findMany({
      where: { userId: ownerId },
      include: { payouts: true },
    }),
    prisma.group.findMany({
      where: { userId: ownerId },
      include: { accounts: { where: { userId: ownerId }, select: { number: true } } },
    }),
  ])

  // An empty selection means "every account this user owns". A selection that
  // names only someone else's accounts must stay empty, not fall through to all.
  const owned = new Set(accounts.map((account) => account.number))
  const accountNumbers =
    requested.length > 0 ? requested.filter((number) => owned.has(number)) : []
  if (requested.length > 0 && accountNumbers.length === 0) {
    return emptyEquity
  }

  const fromDate = from ? new Date(from) : null
  const toDate = to ? new Date(to) : null
  if (toDate) toDate.setUTCHours(23, 59, 59, 999)
  const trades =
    fromDate || toDate
      ? allTrades.filter((trade) => {
          const entryDate = new Date(trade.entryDate)
          if (Number.isNaN(entryDate.getTime())) return false
          if (fromDate && entryDate < fromDate) return false
          if (toDate && entryDate > toDate) return false
          return true
        })
      : allTrades

  const result = computeEquityChartData(
    trades,
    accounts.map((account) => ({
      number: account.number,
      groupId: account.groupId,
      startingBalance: account.startingBalance,
      resetDate: account.resetDate,
      payouts: account.payouts.map((payout) => ({
        date: payout.date,
        amount: payout.amount,
        status: payout.status,
      })),
    })),
    groups.map((group) => ({
      id: group.id,
      name: group.name,
      accounts: group.accounts,
    })),
    {
      instruments: [],
      accountNumbers,
      dateRange: from || to ? { from: from || "", to: to || "" } : undefined,
      pnlRange: {},
      tickRange: {},
      timeRange: { range: null },
      tickFilter: { value: null },
      weekdayFilter: { days: [] },
      hourFilter: { hour: null },
      tagFilter: { tags: [] },
      timezone: "UTC",
      showIndividual,
      maxAccounts: 8,
      dataSampling: "all",
      selectedAccounts: accountNumbers,
    },
  )

  return {
    data: result.chartData,
    accountNumbers: result.accountNumbers,
    dateRange: result.dateRange,
  }
}

export async function readConnections(userId: string) {
  const connections = await getConnectionsForUser(requireUserId(userId))
  return {
    data: connections.map((connection) => ({
      id: connection.id,
      service: connection.service,
      externalId: connection.externalId,
      lastSyncedAt: connection.lastSyncedAt.toISOString(),
      environment: connection.environment,
      accountNumbers: connection.accounts.map((account) => account.number),
      createdAt: connection.createdAt.toISOString(),
    })),
  }
}
