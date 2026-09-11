export const TRADOVATE_TRADE_TAG = 'tradovate'

const FILL_PREFIX = /^fill_/i

export function isTradovatePersistedTrade(trade: {
  tags?: string[] | null
}): boolean {
  return trade.tags?.includes(TRADOVATE_TRADE_TAG) === true
}

/** Strip the optional `fill_` prefix sync historically prepended to fill ids. */
export function normalizeTradovateFillId(
  id: string | null | undefined,
): string {
  return (id ?? '').trim().replace(FILL_PREFIX, '')
}

export function normalizeTradeSide(side: string | null | undefined): string {
  return (side ?? '').trim().toLowerCase()
}

export function tradovateSideFromBuyFirst(
  isBuyFirst: boolean,
): 'Long' | 'Short' {
  return isBuyFirst ? 'Long' : 'Short'
}

/**
 * Entry/close fill ids for a buy/sell pair. Shorts use the sell fill as entry
 * so sync and CSV store the same ids for the same round-trip.
 */
export function tradovateRoundTripFillIds(input: {
  buyFillId: string | number | null | undefined
  sellFillId: string | number | null | undefined
  isBuyFirst: boolean
}): { entryId: string; closeId: string } {
  const buy = normalizeTradovateFillId(
    input.buyFillId == null ? '' : String(input.buyFillId),
  )
  const sell = normalizeTradovateFillId(
    input.sellFillId == null ? '' : String(input.sellFillId),
  )
  return input.isBuyFirst
    ? { entryId: buy, closeId: sell }
    : { entryId: sell, closeId: buy }
}

/**
 * Account + unordered fill pair. Used to reuse an already-persisted row when
 * the UUID algorithm changes or a CSV row still differs on dates/prices.
 */
export function tradovateFillPairKey(trade: {
  accountNumber?: string | null
  entryId?: string | null
  closeId?: string | null
}): string | null {
  const a = normalizeTradovateFillId(trade.entryId)
  const b = normalizeTradovateFillId(trade.closeId)
  if (!a || !b) return null
  return `${trade.accountNumber ?? ''}|${[a, b].sort().join('|')}`
}

export function tradovateFillIdLookupValues(
  id: string | null | undefined,
): string[] {
  const normalized = normalizeTradovateFillId(id)
  if (!normalized) return []
  return [normalized, `fill_${normalized}`]
}

export function resolveTradovatePersistedId(
  incoming: {
    accountNumber?: string | null
    entryId?: string | null
    closeId?: string | null
  },
  existingRows: Array<{
    id: string
    accountNumber?: string | null
    entryId?: string | null
    closeId?: string | null
  }>,
): string | undefined {
  const incomingKey = tradovateFillPairKey(incoming)
  if (!incomingKey) return undefined
  for (const row of existingRows) {
    if (tradovateFillPairKey(row) === incomingKey) return row.id
  }
  return undefined
}
