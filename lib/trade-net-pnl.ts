/**
 * Net PnL for display and aggregates.
 *
 * Most imports store gross PnL in `pnl` and fees in `commission` (net = pnl - commission).
 * DxFeed (and some sync sources) store post-commission PnL in `pnl`; commission is informational only.
 */

const COMMISSION_ALREADY_IN_PNL_TAGS = new Set(['dxfeed', 'tradovate'])

export type TradeNetPnlInput = {
  pnl: number
  commission?: number | null
  tags?: string[] | null
}

export function isCommissionIncludedInTradePnl(trade: TradeNetPnlInput): boolean {
  return trade.tags?.some((tag) => COMMISSION_ALREADY_IN_PNL_TAGS.has(tag)) ?? false
}

export function getTradeNetPnl(trade: TradeNetPnlInput): number {
  const commission = trade.commission ?? 0
  if (isCommissionIncludedInTradePnl(trade)) {
    return trade.pnl
  }
  return trade.pnl - commission
}

export function getTradeGrossPnl(trade: TradeNetPnlInput): number {
  const commission = trade.commission ?? 0
  if (isCommissionIncludedInTradePnl(trade)) {
    return trade.pnl + commission
  }
  return trade.pnl
}
