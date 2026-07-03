export type DrawdownParams = {
  startingBalance: number
  drawdownThreshold: number
  trailingDrawdown?: boolean | null
  trailingStopProfit?: number | null
  highestBalance: number
}

export function computeDrawdownLevel({
  startingBalance,
  drawdownThreshold,
  trailingDrawdown,
  trailingStopProfit,
  highestBalance,
}: DrawdownParams): number {
  const dd = drawdownThreshold || 0
  if (trailingDrawdown) {
    const profitMade = Math.max(0, highestBalance - startingBalance)
    if (trailingStopProfit && profitMade >= trailingStopProfit) {
      return (startingBalance + trailingStopProfit) - dd
    }
    return highestBalance - dd
  }
  return startingBalance - dd
}

/** Prop-firm losses beyond the accepted drawdown floor are not displayed as realized. */
export function clampBalanceAtDrawdownFloor(
  balance: number,
  drawdownThreshold: number,
  drawdownLevel: number
): number {
  return (drawdownThreshold || 0) > 0 ? Math.max(balance, drawdownLevel) : balance
}
