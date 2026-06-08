export type BreakevenRange = {
  min: number
  max: number
}

export const DEFAULT_BREAKEVEN_RANGE: BreakevenRange = {
  min: 0,
  max: 0,
}

export type TradeOutcome = "win" | "loss" | "breakeven"

export function classifyTradeOutcome(
  netPnl: number,
  range: BreakevenRange = DEFAULT_BREAKEVEN_RANGE,
): TradeOutcome {
  const beMin = range.min ?? 0
  const beMax = range.max ?? 0
  if (netPnl >= beMin && netPnl <= beMax) {
    return "breakeven"
  }
  if (netPnl > beMax) {
    return "win"
  }
  return "loss"
}
