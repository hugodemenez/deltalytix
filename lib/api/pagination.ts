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
 * `entryDate` is stored as an ISO string, so filters compare as strings.
 * A date-only `from` is the start of that day; a date-only `to` is the start of
 * the next day (used as an exclusive bound), matching `/metrics/equity`, which
 * treats `to` as end of day. Full timestamps are normalized to UTC ISO.
 * Returns null when the value does not parse.
 */
export function dateFilterBound(
  value: string,
  side: "from" | "to",
): string | null {
  if (DATE_ONLY.test(value)) {
    const day = new Date(`${value}T00:00:00.000Z`)
    if (Number.isNaN(day.getTime())) return null
    if (side === "to") day.setUTCDate(day.getUTCDate() + 1)
    return day.toISOString().slice(0, 10)
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  if (side === "to") parsed.setTime(parsed.getTime() + 1)
  return parsed.toISOString()
}

/** The first `from`/`to` query value that does not parse as a date, if any. */
export function invalidDateFilter(params: URLSearchParams): string | null {
  for (const side of ["from", "to"] as const) {
    const value = params.get(side)
    if (value && !dateFilterBound(value, side)) return side
  }
  return null
}

export function buildTradeWhere(
  userId: string,
  filters: TradeListFilters,
): Prisma.TradeWhereInput {
  const where: Prisma.TradeWhereInput = { userId }

  if (filters.accountNumber) where.accountNumber = filters.accountNumber
  if (filters.instrument) where.instrument = filters.instrument
  if (filters.side) where.side = filters.side

  const from = filters.from ? dateFilterBound(filters.from, "from") : null
  const to = filters.to ? dateFilterBound(filters.to, "to") : null
  if (from || to) {
    where.entryDate = {}
    if (from) where.entryDate.gte = from
    // Exclusive bound: a date-only `to` covers that whole day.
    if (to) where.entryDate.lt = to
  }

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
