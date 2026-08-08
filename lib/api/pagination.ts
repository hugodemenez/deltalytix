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
    return typeof parsed.o === "number" && parsed.o >= 0 ? parsed.o : 0
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

export function buildTradeWhere(
  userId: string,
  filters: TradeListFilters,
): Prisma.TradeWhereInput {
  const where: Prisma.TradeWhereInput = { userId }

  if (filters.accountNumber) where.accountNumber = filters.accountNumber
  if (filters.instrument) where.instrument = filters.instrument
  if (filters.side) where.side = filters.side

  if (filters.from || filters.to) {
    where.entryDate = {}
    if (filters.from) where.entryDate.gte = filters.from
    if (filters.to) where.entryDate.lte = filters.to
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
