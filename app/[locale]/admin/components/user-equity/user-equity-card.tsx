import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getIndividualUserEquityData } from '../../actions/stats'
import { UserEquityChart } from './user-equity-chart'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface UserEquityCardProps {
  userId: string
  traderNumber?: number
}

export async function UserEquityCard({ userId, traderNumber }: UserEquityCardProps) {
  const userData = await getIndividualUserEquityData(userId)
  
  if (!userData) {
    return null
  }

  const { email, statistics, equityCurve, createdAt } = userData

  // Don't render if there are no trades
  if (statistics.totalTrades === 0) {
    return null
  }

  return (
    <Card className="p-4 space-y-4">
      {/* User Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">
            Trader #{traderNumber || userId.slice(0, 8)}
          </h3>
          <p className="text-xs text-muted-foreground">
            {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statistics.totalPnL >= 0 ? "default" : "destructive"}>
            {statistics.totalPnL >= 0 ? '+' : ''}{statistics.totalPnL.toFixed(2)}
          </Badge>
          <Link 
            href={`/admin/dashboard/${userId}`}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="View trader details"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </Link>
        </div>
      </div>

      {/* Equity Curve Chart */}
      <UserEquityChart 
        equityCurve={equityCurve}
        userId={userId}
        totalPnL={statistics.totalPnL}
      />

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trades:</span>
            <span className="font-medium">{statistics.totalTrades}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Win Rate:</span>
            <span className="font-medium">{statistics.winRate.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg Win:</span>
            <span className="font-medium text-green-600">
              {statistics.averageWin.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wins:</span>
            <span className="font-medium text-green-600">{statistics.winningTrades}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Losses:</span>
            <span className="font-medium text-red-600">{statistics.losingTrades}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg Loss:</span>
            <span className="font-medium text-red-600">
              {statistics.averageLoss.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="pt-2 border-t">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Max DD:</span>
            <span className="font-medium text-red-600">
              {statistics.maxDrawdown.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">P.Factor:</span>
            <span className="font-medium">
              {statistics.profitFactor.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
} 