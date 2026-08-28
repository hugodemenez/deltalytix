import crypto from 'crypto'
import { v5 as uuidv5 } from 'uuid'

export const RITHMIC_PROTOCOL_TRADE_TAG = 'rithmic-protocol'

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
  // Create a deterministic string from trade characteristics
  const tradeSignature = [
    tradeData.userId,
    tradeData.accountNumber,
    tradeData.entryId,
    tradeData.closeId,
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
 * UUID v5 written by `saveTradesAction`. Protocol rows were first stored with
 * `commission: 0`, so the identity hash still uses 0 for that source — otherwise
 * a later Product RMS rate would insert a second row for the same round-trip.
 */
export function generatePersistedTradeUUID(trade: PersistedTradeIdentity): string {
  const identityCommission = trade.tags?.includes(RITHMIC_PROTOCOL_TRADE_TAG)
    ? 0
    : (trade.commission || 0)

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
    identityCommission.toString(),
  ].join('|')

  return uuidv5(tradeSignature, TRADE_NAMESPACE)
}
