import { v5 as uuidv5 } from 'uuid'
import type { Trade } from '@/prisma/generated/prisma/client'

// Namespace UUID for deterministic trade ID generation.
const TRADE_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

function normalizeKeyPart(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

/**
 * Generates a deterministic UUID from stable trade identity fields.
 *
 * Financial fields are intentionally excluded: broker corrections or importer
 * PnL-mapping fixes must update the same logical trade, not create a new row.
 */
export function generateTradeUUID(trade: Partial<Trade>): string {
  const hasStableExternalIds = Boolean(normalizeKeyPart(trade.entryId) && normalizeKeyPart(trade.closeId))
  const tradeSignatureParts = [
    normalizeKeyPart(trade.userId),
    normalizeKeyPart(trade.accountNumber),
    normalizeKeyPart(trade.instrument),
    normalizeKeyPart(trade.entryDate),
    normalizeKeyPart(trade.closeDate),
    normalizeKeyPart(trade.entryPrice),
    normalizeKeyPart(trade.closePrice),
    (trade.quantity || 0).toString(),
    normalizeKeyPart(trade.entryId),
    normalizeKeyPart(trade.closeId),
    (trade.timeInPosition || 0).toString(),
    normalizeKeyPart(trade.side),
  ]

  if (!hasStableExternalIds) {
    tradeSignatureParts.push((trade.pnl || 0).toString(), (trade.commission || 0).toString())
  }

  const tradeSignature = tradeSignatureParts.join('|')

  return uuidv5(tradeSignature, TRADE_NAMESPACE)
}

/**
 * Broker syncs provide stable external fill identifiers. Use them to recognize
 * the same trade even when earlier app versions generated a different row ID.
 */
export function getStableBrokerTradeKey(
  trade: Pick<Partial<Trade>, 'userId' | 'accountNumber' | 'entryId' | 'closeId'>,
): string | null {
  const userId = normalizeKeyPart(trade.userId)
  const accountNumber = normalizeKeyPart(trade.accountNumber)
  const entryId = normalizeKeyPart(trade.entryId)
  const closeId = normalizeKeyPart(trade.closeId)

  if (!userId || !accountNumber || !entryId || !closeId) {
    return null
  }

  return [userId, accountNumber, entryId, closeId].join('|')
}

export function getBrokerTradeUpdateData(trade: Trade) {
  return {
    quantity: trade.quantity,
    instrument: trade.instrument,
    entryPrice: trade.entryPrice,
    closePrice: trade.closePrice,
    entryDate: trade.entryDate,
    closeDate: trade.closeDate,
    pnl: trade.pnl,
    timeInPosition: trade.timeInPosition,
    side: trade.side,
    commission: trade.commission,
  }
}

