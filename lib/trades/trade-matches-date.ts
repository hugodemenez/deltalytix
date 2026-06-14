export interface TradeDateFields {
  entryDate?: string | null
  closeDate?: string | null
}

// Match trades to a calendar day key (yyyy-MM-dd), including ISO timestamps.
export function tradeMatchesDateKey(trade: TradeDateFields, dateKey: string): boolean {
  const entryDate = trade.entryDate
  const closeDate = trade.closeDate
  const entryMatches = Boolean(
    entryDate && (entryDate === dateKey || entryDate.startsWith(dateKey)),
  )
  const closeMatches = Boolean(
    closeDate && (closeDate === dateKey || closeDate.startsWith(dateKey)),
  )
  return entryMatches || closeMatches
}
