import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Award, Clock, PiggyBank } from "lucide-react"
import { StatisticsProps } from "@/lib/types"

export default function Component({ statistics }: { statistics: StatisticsProps }) {
  const winRate = (statistics.nbWin / statistics.nbTrades * 100).toFixed(2)
  const lossRate = (statistics.nbLoss / statistics.nbTrades * 100).toFixed(2)
  const beRate = (statistics.nbBe / statistics.nbTrades * 100).toFixed(2)

  const positiveColor = "hsl(var(--chart-2))" // Green color
  const negativeColor = "hsl(var(--chart-1))" // Orangish color
  const neutralColor = "hsl(var(--muted-foreground))" // Neutral color for breakeven

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Winning Streak</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.winningStreak}</div>
            <p className="text-xs text-muted-foreground">Current streak</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Position Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.averagePositionTime}</div>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumulative PnL</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(statistics.cumulativePnl - statistics.cumulativeFees).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Since first import</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Trade Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="transition-all"
                style={{ width: `${winRate}%`, backgroundColor: positiveColor }}
              />
              <div
                className="transition-all"
                style={{ width: `${beRate}%`, backgroundColor: neutralColor }}
              />
              <div
                className="transition-all"
                style={{ width: `${lossRate}%`, backgroundColor: negativeColor }}
              />
            </div>
            <div className="flex flex-wrap text-xs">
              <div style={{ width: `${winRate}%` }} className="text-center min-w-[60px] mb-1">
                <span style={{ color: positiveColor }} className="font-medium">Win: {winRate}%</span>
              </div>
              <div style={{ width: `${beRate}%` }} className="text-center min-w-[60px] mb-1">
                <span style={{ color: neutralColor }} className="font-medium">BE: {beRate}%</span>
              </div>
              <div style={{ width: `${lossRate}%` }} className="text-center min-w-[60px] mb-1">
                <span style={{ color: negativeColor }} className="font-medium">Loss: {lossRate}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}