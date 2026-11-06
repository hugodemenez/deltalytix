/** Marks a FIFO close against a synthetic pre-window opening lot. */
export const RITHMIC_PROTOCOL_OPENING_SEED_TAG = 'rithmic-protocol-opening-seed'
/** Synthetic FIFO entry id, never a real plant fill. */
export const OPENING_SEED_ORDER_ID_PREFIX = 'opening-seed:'

/** Seed-close rows stay in the journal but drop out of win-rate / volume / hold-time. */
export function isOpeningSeedCloseTrade(trade: {
  entryId?: string | null
  tags?: readonly string[] | null
}): boolean {
  return Boolean(trade.entryId?.startsWith(OPENING_SEED_ORDER_ID_PREFIX))
}

export function withoutOpeningSeedCloses<
  T extends {
    entryId?: string | null
    tags?: readonly string[] | null
  },
>(trades: T[]): T[] {
  return trades.filter((trade) => !isOpeningSeedCloseTrade(trade))
}

export function openingSeedExitCommission<
  T extends {
    entryId?: string | null
    tags?: readonly string[] | null
    commission?: number | null
  },
>(trades: T[]): number {
  return trades
    .filter(isOpeningSeedCloseTrade)
    .reduce((sum, trade) => sum + Number(trade.commission || 0), 0)
}

/** Real closes keep net PnL; seed closes contribute only the exit fee. */
export function analysisNetPnl(trade: {
  entryId?: string | null
  tags?: readonly string[] | null
  pnl?: number | null
  commission?: number | null
}): number {
  const commission = Number(trade.commission || 0)
  if (isOpeningSeedCloseTrade(trade)) return -commission
  return Number(trade.pnl || 0) - commission
}
