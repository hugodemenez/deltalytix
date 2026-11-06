import {
  analysisNetPnl,
  withoutOpeningSeedCloses,
} from '@/lib/opening-seed'

export type TeamTraderStatTrade = {
  entryId?: string | null
  pnl: number
  commission?: number | null
  createdAt?: Date
  entryDate?: string
}

export type TeamTraderEquityPoint = {
  date: string
  pnl: number
  cumulativePnL: number
  tradeNumber: number
}

export type TeamTraderStatistics = {
  totalTrades: number
  totalPnL: number
  winRate: number
  averageWin: number
  averageLoss: number
  maxDrawdown: number
  profitFactor: number
  winningTrades: number
  losingTrades: number
}

function tradeDateIso(
  trade: TeamTraderStatTrade,
  dateField: 'createdAt' | 'entryDate',
): string {
  if (dateField === 'createdAt' && trade.createdAt) {
    return trade.createdAt.toISOString().slice(0, 10)
  }
  return (trade.entryDate ?? '').slice(0, 10)
}

function tradeSortMs(
  trade: TeamTraderStatTrade,
  dateField: 'createdAt' | 'entryDate',
): number {
  if (dateField === 'createdAt' && trade.createdAt) {
    return trade.createdAt.getTime()
  }
  return Date.parse(trade.entryDate ?? '') || 0
}

export function calculateMaxDrawdown(
  equityCurve: { cumulativePnL: number }[],
): number {
  let maxDrawdown = 0
  let peak = 0
  for (const point of equityCurve) {
    if (point.cumulativePnL > peak) peak = point.cumulativePnL
    const drawdown = peak - point.cumulativePnL
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
  }
  return maxDrawdown
}

export function teamTraderPerformance<T extends TeamTraderStatTrade>(
  trades: T[],
  dateField: 'createdAt' | 'entryDate' = 'entryDate',
): {
  trades: T[]
  equityCurve: TeamTraderEquityPoint[]
  statistics: TeamTraderStatistics
} {
  const analysis = withoutOpeningSeedCloses(trades)
  const sorted = [...analysis].sort(
    (a, b) => tradeSortMs(a, dateField) - tradeSortMs(b, dateField),
  )
  let cumulativePnL = 0
  const equityCurve = sorted.map((trade, index) => {
    const netPnl = analysisNetPnl(trade)
    cumulativePnL += netPnl
    return {
      date: tradeDateIso(trade, dateField),
      pnl: netPnl,
      cumulativePnL,
      tradeNumber: index + 1,
    }
  })
  const nets = analysis.map((trade) => analysisNetPnl(trade))
  const winning = nets.filter((net) => net > 0)
  const losing = nets.filter((net) => net < 0)
  const averageWin =
    winning.length > 0
      ? winning.reduce((sum, net) => sum + net, 0) / winning.length
      : 0
  const averageLoss =
    losing.length > 0
      ? losing.reduce((sum, net) => sum + net, 0) / losing.length
      : 0
  return {
    trades: analysis,
    equityCurve,
    statistics: {
      totalTrades: analysis.length,
      totalPnL: nets.reduce((sum, net) => sum + net, 0),
      winRate: analysis.length > 0 ? (winning.length / analysis.length) * 100 : 0,
      averageWin,
      averageLoss,
      maxDrawdown: calculateMaxDrawdown(equityCurve),
      profitFactor:
        Math.abs(averageLoss) > 0
          ? Math.abs(averageWin) / Math.abs(averageLoss)
          : 0,
      winningTrades: winning.length,
      losingTrades: losing.length,
    },
  }
}
