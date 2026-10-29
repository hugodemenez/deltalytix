import type { Prisma } from "@/prisma/generated/prisma/client"

export const DEFAULT_PAGE_LIMIT = 100
export const MAX_PAGE_LIMIT = 500

export function parseLimit(value: string | null): number {
  const n = value ? Number.parseInt(value, 10) : DEFAULT_PAGE_LIMIT
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PAGE_LIMIT
  return Math.min(n, MAX_PAGE_LIMIT)
}

export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset }), "utf8").toString("base64url")
}

export function decodeCursor(cursor: string | null): number {
  if (!cursor) return 0
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as { o?: number }
    // Prisma's `skip` must be an integer; a hand-made `{"o":1.5}` would 500.
    return Number.isSafeInteger(parsed.o) && parsed.o! >= 0 ? parsed.o! : 0
  } catch {
    return 0
  }
}

export type TradeListFilters = {
  accountNumber?: string
  instrument?: string
  side?: string
  from?: string
  to?: string
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Parse a `from`/`to` query bound into a Date for in-memory comparison.
 * A date-only `from` is the start of that UTC day; a date-only `to` is the
 * start of the next UTC day (exclusive), matching `/metrics/equity`, which
 * treats `to` as end of day. Full timestamps use an exclusive upper bound of
 * the parsed instant + 1ms. Returns null when the value does not parse.
 */
export function dateFilterBound(
  value: string,
  side: "from" | "to",
): Date | null {
  if (DATE_ONLY.test(value)) {
    const day = new Date(`${value}T00:00:00.000Z`)
    if (Number.isNaN(day.getTime())) return null
    if (side === "to") day.setUTCDate(day.getUTCDate() + 1)
    return day
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  if (side === "to") parsed.setTime(parsed.getTime() + 1)
  return parsed
}

/** Parse a stored trade `entryDate` (ISO or legacy month-first strings). */
export function parseStoredTradeDate(value: string): Date | null {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Inclusive `from`, exclusive `to`, comparing parsed instants. */
export function tradeMatchesDateRange(
  entryDate: string,
  from: Date | null,
  to: Date | null,
): boolean {
  const parsed = parseStoredTradeDate(entryDate)
  if (!parsed) return false
  if (from && parsed < from) return false
  if (to && parsed >= to) return false
  return true
}

/**
 * Filter by parsed `from`/`to` and sort by parsed entryDate desc, id desc.
 * Needed because some older rows store non-ISO `entryDate` strings
 * (e.g. `02/18/2025 11:01:49`); Prisma string compares would exclude/mis-order them.
 */
export function filterAndSortTradesByEntryDate<
  T extends { id: string; entryDate: string },
>(trades: T[], filters: Pick<TradeListFilters, "from" | "to">): T[] {
  const from = filters.from ? dateFilterBound(filters.from, "from") : null
  const to = filters.to ? dateFilterBound(filters.to, "to") : null

  const filtered =
    from || to
      ? trades.filter((trade) => tradeMatchesDateRange(trade.entryDate, from, to))
      : trades.slice()

  return filtered.sort((a, b) => {
    const aTime = parseStoredTradeDate(a.entryDate)?.getTime() ?? Number.NEGATIVE_INFINITY
    const bTime = parseStoredTradeDate(b.entryDate)?.getTime() ?? Number.NEGATIVE_INFINITY
    if (bTime !== aTime) return bTime - aTime
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
  })
}

/** The first `from`/`to` query value that does not parse as a date, if any. */
export function invalidDateFilter(params: URLSearchParams): string | null {
  for (const side of ["from", "to"] as const) {
    const value = params.get(side)
    if (value && !dateFilterBound(value, side)) return side
  }
  return null
}

/**
 * Prisma filters for non-date fields only. Date range is applied in memory via
 * {@link filterAndSortTradesByEntryDate} so legacy non-ISO `entryDate` values match.
 */
export function buildTradeWhere(
  userId: string,
  filters: TradeListFilters,
): Prisma.TradeWhereInput {
  // The account number, instrument, and side are filters on top of the token's
  // user. A blank user id must not become a query that matches every tenant.
  if (!userId.trim()) {
    throw new Error("Trade queries require the authenticated user id")
  }
  const where: Prisma.TradeWhereInput = { userId }

  if (filters.accountNumber) where.accountNumber = filters.accountNumber
  if (filters.instrument) where.instrument = filters.instrument
  if (filters.side) where.side = filters.side

  return where
}

export function serializeTrade(trade: {
  id: string
  accountNumber: string
  instrument: string
  side: string | null
  quantity: number
  entryPrice: string
  closePrice: string
  entryDate: string
  closeDate: string
  pnl: number
  commission: number
  timeInPosition: number
  tags: string[]
  comment: string | null
  createdAt: Date
}) {
  return {
    id: trade.id,
    accountNumber: trade.accountNumber,
    instrument: trade.instrument,
    side: trade.side,
    quantity: trade.quantity,
    entryPrice: trade.entryPrice,
    closePrice: trade.closePrice,
    entryDate: trade.entryDate,
    closeDate: trade.closeDate,
    pnl: trade.pnl,
    commission: trade.commission,
    timeInPosition: trade.timeInPosition,
    tags: trade.tags,
    comment: trade.comment,
    createdAt: trade.createdAt.toISOString(),
  }
}

export function computeProfitFactor(trades: { pnl: number; commission: number }[]): number {
  const grossProfits = trades.reduce((sum, trade) => {
    const totalPnL = trade.pnl - trade.commission
    return totalPnL > 0 ? sum + totalPnL : sum
  }, 0)

  const grossLosses = Math.abs(
    trades.reduce((sum, trade) => {
      const totalPnL = trade.pnl - trade.commission
      return totalPnL < 0 ? sum + totalPnL : sum
    }, 0),
  )

  if (grossLosses === 0) {
    return grossProfits > 0 ? Number.POSITIVE_INFINITY : 1
  }
  return grossProfits / grossLosses
}
