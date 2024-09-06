import { StatisticsProps } from "@/lib/types"
import WinningStreakCard from "./statistics/winning-streak-card"
import AveragePositionTimeCard from "./statistics/average-position-time-card"
import CumulativePnlCard from "./statistics/cumulative-pnl-card"
import TradePerformanceCard from "./statistics/trade-performance-card"

export default function Statistics({ statistics }: { statistics: StatisticsProps }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <WinningStreakCard winningStreak={statistics.winningStreak} />
        <AveragePositionTimeCard averagePositionTime={statistics.averagePositionTime} />
        <CumulativePnlCard cumulativePnl={statistics.cumulativePnl} cumulativeFees={statistics.cumulativeFees} />
      <TradePerformanceCard
        nbWin={statistics.nbWin}
        nbLoss={statistics.nbLoss}
        nbBe={statistics.nbBe}
        nbTrades={statistics.nbTrades}
      />
      </div>
    </div>
  )
}