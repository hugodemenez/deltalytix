'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { getUserEquityData } from '../../actions/stats'
import { Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { UserEquityChart } from './user-equity-chart'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

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

interface UserEquityGridClientProps {
  initialUserCards: React.ReactNode[]
  totalUsers: number
  hasMore: boolean
}

export function UserEquityGridClient({ initialUserCards, totalUsers, hasMore: initialHasMore }: UserEquityGridClientProps) {
  const [userCards, setUserCards] = useState<React.ReactNode[]>(initialUserCards)
  const [additionalUsers, setAdditionalUsers] = useState<UserEquityData[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showDailyView, setShowDailyView] = useState(true)
  
  const observerRef = useRef<IntersectionObserver>(null)
  const loadingRef = useRef<HTMLDivElement>(null)

  const loadMoreUsers = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const data = await getUserEquityData(currentPage, 10)
      
      // Store the user data for rendering
      setAdditionalUsers(prev => [...prev, ...data.users])
      setHasMore(data.hasMore)
      setCurrentPage(currentPage + 1)
    } catch (error) {
      console.error('Error loading more users:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [currentPage, hasMore, isLoadingMore])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMoreUsers()
        }
      },
      { threshold: 0.1 }
    )

    if (loadingRef.current) {
      observer.observe(loadingRef.current)
    }

    observerRef.current = observer

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, isLoadingMore, loadMoreUsers])

  return (
    <>
      {/* View Toggle */}
      <div className="flex items-center space-x-2 mb-6">
        <Switch
          id="view-mode"
          checked={showDailyView}
          onCheckedChange={setShowDailyView}
        />
        <Label htmlFor="view-mode" className="text-sm font-medium">
          {showDailyView ? 'Daily View' : 'Trade View'}
        </Label>
        <span className="text-xs text-muted-foreground ml-2">
          {showDailyView ? 'Grouped by day' : 'Individual trades'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userCards}
        
        {/* Render additional users with proper charts */}
        {additionalUsers
          .filter(user => user.statistics.totalTrades > 0) // Only show users with trades
          .map((user, index) => {
            // Calculate trader number based on initial cards + current index
            const traderNumber = (initialUserCards?.length || 0) + index + 1
            
            return (
              <Card key={user.userId} className="p-4 space-y-4">
                {/* User Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">
                      Trader #{traderNumber}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      user.statistics.totalPnL >= 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.statistics.totalPnL >= 0 ? '+' : ''}{user.statistics.totalPnL.toFixed(2)}
                    </div>
                    <Link 
                      href={`/admin/dashboard/${user.userId}`}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="View trader details"
                    >
                      <ExternalLink className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                    </Link>
                  </div>
                </div>

                {/* Chart */}
                <UserEquityChart 
                  equityCurve={user.equityCurve}
                  userId={user.userId}
                  totalPnL={user.statistics.totalPnL}
                  showDailyView={showDailyView}
                />

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trades:</span>
                      <span className="font-medium">{user.statistics.totalTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Win Rate:</span>
                      <span className="font-medium">{user.statistics.winRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Win:</span>
                      <span className="font-medium text-green-600">
                        {user.statistics.averageWin.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Wins:</span>
                      <span className="font-medium text-green-600">{user.statistics.winningTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Losses:</span>
                      <span className="font-medium text-red-600">{user.statistics.losingTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Loss:</span>
                      <span className="font-medium text-red-600">
                        {user.statistics.averageLoss.toFixed(2)}
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
                        {user.statistics.maxDrawdown.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">P.Factor:</span>
                      <span className="font-medium">
                        {user.statistics.profitFactor.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
      </div>

      {/* Loading indicator for infinite scroll */}
      {hasMore && (
        <div ref={loadingRef} className="flex justify-center py-4">
          {isLoadingMore ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Scroll to load more...</div>
          )}
        </div>
      )}

      {/* End of results */}
      {!hasMore && (userCards.length > 0 || additionalUsers.length > 0) && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No more users to load
        </div>
      )}
    </>
  )
} 