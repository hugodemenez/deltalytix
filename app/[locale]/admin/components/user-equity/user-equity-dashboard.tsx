import { getUserEquityData } from '../../actions/stats'
import { UserEquityGrid } from './user-equity-grid'

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

interface PaginatedData {
  users: UserEquityData[]
  totalUsers: number
  hasMore: boolean
}


export async function UserEquityDashboard() {
  // Fetch initial data
  const data: PaginatedData = await getUserEquityData(1, 5)

  return (
    <div className="p-6 space-y-6">
      <UserEquityGrid initialUsers={[]} totalUsers={data.totalUsers} hasMore={data.hasMore} />
    </div>
  )
} 