import { Card } from "@/components/ui/card"
import { UserEquityCard } from './user-equity-card'
import { getUserEquityData } from '../../actions/stats'
import { Suspense } from 'react'
import { UserEquityGridClient } from './user-equity-grid-client'

interface UserEquityData {
  userId: string
  email: string
  createdAt: string
  trades: any[]
  equityCurve: {
    date: string
    pnl: number
    cumulativePnL: number
    tradeNumber: number
  }[]
  statistics: {
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
}

interface UserEquityGridProps {
  initialUsers: UserEquityData[]
  totalUsers: number
  hasMore: boolean
}

export async function UserEquityGrid({ initialUsers, totalUsers, hasMore: initialHasMore }: UserEquityGridProps) {
  // Create server components for each user with trader numbers
  const userCards = initialUsers.map((user, index) => (
    <Suspense key={user.userId} fallback={
      <Card className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    }>
      <UserEquityCard userId={user.userId} traderNumber={index + 1} />
    </Suspense>
  ))


  return (
    <UserEquityGridClient 
      initialUserCards={userCards}
      totalUsers={totalUsers}
      hasMore={initialHasMore}
    />
  )
} 