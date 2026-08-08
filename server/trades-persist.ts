import 'server-only'

import { Trade } from '@/prisma/generated/prisma/client'
import { revalidateTag, updateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { v5 as uuidv5 } from 'uuid'
import { capturePostHogEvent } from '@/lib/posthog-server'

export type TradePersistError =
  | 'DUPLICATE_TRADES'
  | 'NO_TRADES_ADDED'
  | 'DATABASE_ERROR'
  | 'INVALID_DATA'

export interface TradePersistResponse {
  error: TradePersistError | false
  numberOfTradesAdded: number
  details?: unknown
  trades?: Trade[]
}

const TRADE_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

function generateTradeUUID(trade: Partial<Trade>): string {
  const tradeSignature = [
    trade.userId || '',
    trade.accountNumber || '',
    trade.instrument || '',
    trade.entryDate || '',
    trade.closeDate || '',
    trade.entryPrice || '',
    trade.closePrice || '',
    (trade.quantity || 0).toString(),
    trade.entryId || '',
    trade.closeId || '',
    (trade.timeInPosition || 0).toString(),
    trade.side || '',
    (trade.pnl || 0).toString(),
    (trade.commission || 0).toString(),
  ].join('|')

  return uuidv5(tradeSignature, TRADE_NAMESPACE)
}

/**
 * Persist trades for a known user id.
 *
 * Not a server action — only import this from already-authenticated API routes
 * (Thor/ETP tokens) or sync helpers that resolved the owner themselves.
 */
export async function persistTradesForUser(
  userId: string,
  data: Trade[],
  options?: { connectionId?: string | null },
): Promise<TradePersistResponse> {
  console.log('[saveTrades] Saving trades:', data.length)
  if (!Array.isArray(data) || data.length === 0) {
    return {
      error: 'INVALID_DATA',
      numberOfTradesAdded: 0,
      details: 'No trades provided',
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

    const { upsertAccountsForNumbers } = await import('@/server/connections')
    const accountIdByNumber = await upsertAccountsForNumbers(
      userId,
      accountNumbers,
      options?.connectionId,
    )

    const userAssignedTrades = data.map((trade) => {
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
        id: generateTradeUUID({ ...trade, userId }),
      } as Trade
    })

    const result = await prisma.trade.createMany({
      data: userAssignedTrades,
      skipDuplicates: true,
    })

    if (result.count === 0) {
      console.log('[saveTrades] No trades added. Checking for duplicates:', {
        attempted: data.length,
      })
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
        console.log('[saveTrades] Found existing trades:', existingTrades)
        return {
          error: 'DUPLICATE_TRADES',
          numberOfTradesAdded: 0,
          details: existingTrades,
        }
      }
    }

    try {
      updateTag(`trades-${userId}`)
      updateTag(`user-data-${userId}`)
    } catch {
      revalidateTag(`trades-${userId}`, { expire: 0 })
      revalidateTag(`user-data-${userId}`, { expire: 0 })
    }

    if (result.count > 0) {
      const sources = Array.from(
        new Set(userAssignedTrades.flatMap((trade) => trade.tags ?? [])),
      )

      await capturePostHogEvent({
        distinctId: userId,
        event: 'trades_imported',
        properties: {
          imported_trade_count: result.count,
          attempted_trade_count: data.length,
          import_sources: sources.join(','),
          is_first_import: !hadExistingTrades,
        },
      })

      if (!hadExistingTrades) {
        await capturePostHogEvent({
          distinctId: userId,
          event: 'first_trade_imported',
          properties: {
            imported_trade_count: result.count,
            import_sources: sources.join(','),
          },
        })
      }
    }

    return {
      error: result.count === 0 ? 'NO_TRADES_ADDED' : false,
      numberOfTradesAdded: result.count,
      trades: result.count > 0 ? userAssignedTrades : undefined,
    }
  } catch (error) {
    console.error('[saveTrades] Database error:', error)
    return {
      error: 'DATABASE_ERROR',
      numberOfTradesAdded: 0,
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
