import crypto from 'crypto'
import { v5 as uuidv5 } from 'uuid'
import { canonicalRithmicFillId } from '@/lib/rithmic-protocol/dedupe-fills'
import {
  isTradovatePersistedTrade,
  normalizeTradeSide,
  normalizeTradovateFillId,
} from '@/lib/tradovate/identity'

export const RITHMIC_PROTOCOL_TRADE_TAG = 'rithmic-protocol'
export { TRADOVATE_TRADE_TAG } from '@/lib/tradovate/identity'

/** Same DNS namespace used by `saveTradesAction` since Protocol imports began. */
const TRADE_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

// Generate deterministic ID for trades based on their unique characteristics
export function generateDeterministicTradeId(tradeData: {
  accountNumber: string
  entryId: string
  closeId: string
  instrument: string
  entryPrice: string
  closePrice: string
  entryDate: string
  closeDate: string
  quantity: number
  side: string
  userId: string
}): string {
  // Replay `basketId_fillId` and the bare history id are the same fill.
  // Hash the canonical form so a row stored under the prefixed id keeps
  // this in-memory id on resync.
  const entryId = canonicalRithmicFillId(tradeData.entryId) ?? tradeData.entryId
  const closeId = canonicalRithmicFillId(tradeData.closeId) ?? tradeData.closeId
  const tradeSignature = [
    tradeData.userId,
    tradeData.accountNumber,
    entryId,
    closeId,
    tradeData.instrument,
    tradeData.entryPrice,
    tradeData.closePrice,
    tradeData.entryDate,
    tradeData.closeDate,
    tradeData.quantity.toString(),
    tradeData.side
  ].join('|')
  
  // Generate a deterministic hash from the signature
  const hash = crypto.createHash('sha256').update(tradeSignature).digest('hex')
  
  // Return a UUID-like format using the hash
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join('-')
}

export type PersistedTradeIdentity = {
  userId?: string | null
  accountNumber?: string | null
  instrument?: string | null
  entryDate?: string | null
  closeDate?: string | null
  entryPrice?: string | null
  closePrice?: string | null
  quantity?: number | null
  entryId?: string | null
  closeId?: string | null
  timeInPosition?: number | null
  side?: string | null
  pnl?: number | null
  commission?: number | null
  tags?: string[] | null
}

/**
 * UUID v5 written by `saveTradesAction`.
 *
 * Protocol rows were first stored with `commission: 0`, so the identity hash
 * still uses 0 for that source — otherwise a later Product RMS rate would
 * insert a second row for the same round-trip. Replay `basketId_fillId`
 * entry/close ids hash as the bare history id so a resync after #536 does
 * not mint a second UUID. Rows already stored under the prefixed hash are
 * rematched in `saveTradesAction`.
 *
 * Tradovate live sync and weekly movement CSVs describe the same fill with
 * different wrappers (`fill_` prefix, Long/long) and different fee/PnL math.
 * Identity is the account + unordered fill pair so `skipDuplicates` can drop
 * the re-import. Dates, prices, duration, pnl, and commission stay off the
 * hash — they are the noisy fields between those two sources.
 */
export function generatePersistedTradeUUID(trade: PersistedTradeIdentity): string {
  if (isTradovatePersistedTrade(trade)) {
    const fillA = normalizeTradovateFillId(trade.entryId)
    const fillB = normalizeTradovateFillId(trade.closeId)
    const [entryId, closeId] = [fillA, fillB].sort()
    const tradeSignature = [
      trade.userId || '',
      trade.accountNumber || '',
      trade.instrument || '',
      (trade.quantity || 0).toString(),
      entryId,
      closeId,
      normalizeTradeSide(trade.side),
      '0',
      '0',
    ].join('|')
    return uuidv5(tradeSignature, TRADE_NAMESPACE)
  }

  const isRithmicProtocol = trade.tags?.includes(RITHMIC_PROTOCOL_TRADE_TAG) === true
  const identityCommission = isRithmicProtocol ? 0 : (trade.commission || 0)
  const entryId = isRithmicProtocol
    ? (canonicalRithmicFillId(trade.entryId) || trade.entryId || '')
    : (trade.entryId || '')
  const closeId = isRithmicProtocol
    ? (canonicalRithmicFillId(trade.closeId) || trade.closeId || '')
    : (trade.closeId || '')

  const tradeSignature = [
    trade.userId || '',
    trade.accountNumber || '',
    trade.instrument || '',
    trade.entryDate || '',
    trade.closeDate || '',
    trade.entryPrice || '',
    trade.closePrice || '',
    (trade.quantity || 0).toString(),
    entryId,
    closeId,
    (trade.timeInPosition || 0).toString(),
    trade.side || '',
    (trade.pnl || 0).toString(),
    identityCommission.toString(),
  ].join('|')

  return uuidv5(tradeSignature, TRADE_NAMESPACE)
}
