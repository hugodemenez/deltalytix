/** Marks a FIFO close against a synthetic pre-window opening lot. */
export const RITHMIC_PROTOCOL_OPENING_SEED_TAG = 'rithmic-protocol-opening-seed'
/** Synthetic FIFO entry id, never a real plant fill. */
export const OPENING_SEED_ORDER_ID_PREFIX = 'opening-seed:'

/** Seed-close rows stay in the journal but drop out of win-rate / volume / hold-time. */
export function isOpeningSeedCloseTrade(trade: {
  entryId?: string | null
  tags?: readonly string[] | null
}): boolean {
  if (trade.entryId?.startsWith(OPENING_SEED_ORDER_ID_PREFIX)) return true
  return Boolean(trade.tags?.includes(RITHMIC_PROTOCOL_OPENING_SEED_TAG))
}

export function withoutOpeningSeedCloses<
  T extends {
    entryId?: string | null
    tags?: readonly string[] | null
  },
>(trades: T[]): T[] {
  return trades.filter((trade) => !isOpeningSeedCloseTrade(trade))
}
