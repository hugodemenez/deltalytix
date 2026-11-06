import { analysisNetPnl, withoutOpeningSeedCloses } from '@/lib/opening-seed'

export type SharedOgTrade = {
  entryId?: string | null
  pnl?: number | null
  commission?: number | null
}

export function sharedOgTradeStats(trades: SharedOgTrade[]) {
  const analysis = withoutOpeningSeedCloses(trades)
  const nets = analysis.map((trade) => analysisNetPnl(trade))
  const totalPnl = nets.reduce((sum, net) => sum + net, 0)
  const winningTrades = analysis.filter((_, index) => nets[index]! > 0)
  const losingTrades = analysis.filter((_, index) => nets[index]! < 0)
  const winRate =
    analysis.length > 0 ? (winningTrades.length / analysis.length) * 100 : 0
  const avgWin =
    winningTrades.length > 0
      ? winningTrades.reduce((sum, trade) => sum + analysisNetPnl(trade), 0) /
        winningTrades.length
      : 0
  const avgLoss =
    losingTrades.length > 0
      ? Math.abs(
          losingTrades.reduce((sum, trade) => sum + analysisNetPnl(trade), 0) /
            losingTrades.length,
        )
      : 0
  const cumulativePnl = nets.reduce((acc, net) => {
    const lastValue = acc.length > 0 ? acc[acc.length - 1]! : 0
    acc.push(lastValue + net)
    return acc
  }, [] as number[])
  return {
    totalTrades: analysis.length,
    totalPnl,
    winningTrades,
    losingTrades,
    winRate,
    avgWin,
    avgLoss,
    riskRewardRatio: avgLoss > 0 ? avgWin / avgLoss : 0,
    cumulativePnl,
    analysis,
  }
}
