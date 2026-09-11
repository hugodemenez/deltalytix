import type { Trade } from "@/prisma/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { formatTimestamp } from "@/lib/date-utils"
import { capturePostHogEvent } from "@/lib/posthog-server"
import { revalidateTag, updateTag } from "next/cache"
import {
  generatePersistedTradeUUID,
  RITHMIC_PROTOCOL_TRADE_TAG,
} from "@/lib/trade-id-utils"
import {
  isTradovatePersistedTrade,
  resolveTradovatePersistedId,
  tradovateFillIdLookupValues,
} from "@/lib/tradovate/identity"
import { isDuplicateTradesOnlySave } from "@/lib/trades/save-trades-outcome"

export type TradeError =
  | "DUPLICATE_TRADES"
  | "NO_TRADES_ADDED"
  | "DATABASE_ERROR"
  | "INVALID_DATA"

export interface TradeSaveResult {
  error: TradeError | false
  numberOfTradesAdded: number
  details?: unknown
  trades?: Trade[]
}

export function generateTradeUUID(trade: Partial<Trade>): string {
  return generatePersistedTradeUUID(trade)
}

async function invalidateTradeCaches(userId: string): Promise<void> {
  try {
    updateTag(`trades-${userId}`)
    updateTag(`user-data-${userId}`)
  } catch {
    revalidateTag(`trades-${userId}`, { expire: 0 })
    revalidateTag(`user-data-${userId}`, { expire: 0 })
  }
}

async function backfillRithmicProtocolCommissions(
  userId: string,
  trades: Trade[],
): Promise<number> {
  const protocolTrades = trades.filter(
    (trade) => trade.tags?.includes(RITHMIC_PROTOCOL_TRADE_TAG) && trade.id,
  )
  if (protocolTrades.length === 0) return 0

  const existing = await prisma.trade.findMany({
    where: { userId, id: { in: protocolTrades.map((trade) => trade.id) } },
    select: { id: true, commission: true },
  })
  const currentById = new Map(existing.map((row) => [row.id, row.commission]))
  const updates = protocolTrades.filter((trade) => {
    const current = currentById.get(trade.id)
    return current != null && current !== trade.commission
  })
  if (updates.length === 0) return 0

  const chunkSize = 100
  for (let offset = 0; offset < updates.length; offset += chunkSize) {
    const chunk = updates.slice(offset, offset + chunkSize)
    await prisma.$transaction(
      chunk.map((trade) =>
        prisma.trade.updateMany({
          where: { id: trade.id, userId },
          data: { commission: trade.commission },
        }),
      ),
    )
  }
  console.log(
    `[saveTrades] Updated commission on ${updates.length} existing ${RITHMIC_PROTOCOL_TRADE_TAG} trade(s)`,
  )
  return updates.length
}

async function assignExistingTradovateIds(
  userId: string,
  trades: Trade[],
): Promise<Trade[]> {
  const tradovateTrades = trades.filter(isTradovatePersistedTrade)
  if (tradovateTrades.length === 0) return trades

  const fillCandidates = [
    ...new Set(
      tradovateTrades.flatMap((trade) => [
        ...tradovateFillIdLookupValues(trade.entryId),
        ...tradovateFillIdLookupValues(trade.closeId),
      ]),
    ),
  ]
  if (fillCandidates.length === 0) return trades

  const existing = await prisma.trade.findMany({
    where: {
      userId,
      OR: [
        { entryId: { in: fillCandidates } },
        { closeId: { in: fillCandidates } },
      ],
    },
    select: { id: true, accountNumber: true, entryId: true, closeId: true },
  })
  if (existing.length === 0) return trades

  return trades.map((trade) => {
    if (!isTradovatePersistedTrade(trade)) return trade
    const existingId = resolveTradovatePersistedId(trade, existing)
    return existingId ? { ...trade, id: existingId } : trade
  })
}

export async function saveTradesCore(
  data: Trade[],
  options: { userId: string; connectionId?: string | null },
): Promise<TradeSaveResult> {
  const { userId } = options

  if (!Array.isArray(data) || data.length === 0) {
    return {
      error: "INVALID_DATA",
      numberOfTradesAdded: 0,
      details: "No trades provided",
    }
  }

  try {
    const hadExistingTrades = Boolean(
      await prisma.trade.findFirst({
        where: { userId },
        select: { id: true },
      }),
    )

    const accountNumbers = data
      .map((trade) => trade.accountNumber)
      .filter((n): n is string => Boolean(n))

    const { upsertAccountsForNumbers } = await import("@/server/connections")
    const accountIdByNumber = await upsertAccountsForNumbers(
      userId,
      accountNumbers,
      options.connectionId,
    )

    const preparedTrades = data.map((trade) => {
      const accountId =
        trade.accountId ||
        (trade.accountNumber
          ? accountIdByNumber.get(trade.accountNumber)
          : undefined) ||
        null

      return {
        ...trade,
        userId,
        accountId,
        id: generatePersistedTradeUUID({ ...trade, userId }),
      } as Trade
    })

    const userAssignedTrades = await assignExistingTradovateIds(
      userId,
      preparedTrades,
    )

    const result = await prisma.trade.createMany({
      data: userAssignedTrades,
      skipDuplicates: true,
    })

    const commissionsUpdated = await backfillRithmicProtocolCommissions(
      userId,
      userAssignedTrades,
    )

    if (isDuplicateTradesOnlySave(result.count, commissionsUpdated)) {
      const tradeIds = userAssignedTrades.map((trade) => trade.id)
      const existingTrades = await prisma.trade.findMany({
        where: { id: { in: tradeIds } },
        select: {
          id: true,
          entryDate: true,
          instrument: true,
        },
      })

      if (existingTrades.length > 0) {
        return {
          error: "DUPLICATE_TRADES",
          numberOfTradesAdded: 0,
          details: existingTrades,
        }
      }
    }

    await invalidateTradeCaches(userId)

    if (result.count > 0) {
      const sources = Array.from(
        new Set(userAssignedTrades.flatMap((trade) => trade.tags ?? [])),
      )

      await capturePostHogEvent({
        distinctId: userId,
        event: "trades_imported",
        properties: {
          imported_trade_count: result.count,
          attempted_trade_count: data.length,
          import_sources: sources.join(","),
          is_first_import: !hadExistingTrades,
        },
      })

      if (!hadExistingTrades) {
        await capturePostHogEvent({
          distinctId: userId,
          event: "first_trade_imported",
          properties: {
            imported_trade_count: result.count,
            import_sources: sources.join(","),
          },
        })
      }
    }

    return {
      error: result.count === 0 ? "NO_TRADES_ADDED" : false,
      numberOfTradesAdded: result.count,
      trades: result.count > 0 ? userAssignedTrades : undefined,
    }
  } catch (error) {
    console.error("[saveTradesCore] Database error:", error)
    return {
      error: "DATABASE_ERROR",
      numberOfTradesAdded: 0,
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

/** Normalize API trade input into a Trade-shaped object ready for saveTradesCore. */
export function normalizeTradeInput(
  input: Record<string, unknown>,
  userId: string,
): Trade {
  const entryDate =
    typeof input.entryDate === "string"
      ? formatTimestamp(input.entryDate)
      : new Date().toISOString()
  const closeDate =
    typeof input.closeDate === "string"
      ? formatTimestamp(input.closeDate)
      : new Date().toISOString()

  return {
    id: "",
    accountNumber: String(input.accountNumber ?? ""),
    accountId: null,
    quantity: Number(input.quantity ?? 0),
    entryId: input.entryId != null ? String(input.entryId) : "",
    closeId: input.closeId != null ? String(input.closeId) : "",
    instrument: String(input.instrument ?? ""),
    entryPrice: String(input.entryPrice ?? "0"),
    closePrice: String(input.closePrice ?? "0"),
    entryDate,
    closeDate,
    pnl: Number(input.pnl ?? 0),
    timeInPosition: Number(input.timeInPosition ?? 0),
    userId,
    side: input.side != null ? String(input.side) : "",
    commission: Number(input.commission ?? 0),
    createdAt: new Date(),
    comment: input.comment != null ? String(input.comment) : null,
    tags: Array.isArray(input.tags)
      ? input.tags.map(String)
      : [],
    imageBase64: null,
    videoUrl: null,
    imageBase64Second: null,
    groupId: "",
    images: [],
  } as Trade
}
