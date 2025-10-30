import crypto from 'crypto'

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