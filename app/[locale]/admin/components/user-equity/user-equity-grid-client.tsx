'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { getUserEquityData } from '../../actions/stats'
import { Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { UserEquityChart } from './user-equity-chart'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Filter, X } from 'lucide-react'

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

interface Filters {
  minTrades: number
  minTradedDays: number
  equityFilter: 'all' | 'positive' | 'negative'
}

export function UserEquityGridClient({ initialUserCards, totalUsers, hasMore: initialHasMore }: UserEquityGridClientProps) {
  const [userCards, setUserCards] = useState<React.ReactNode[]>(initialUserCards)
  const [additionalUsers, setAdditionalUsers] = useState<UserEquityData[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showDailyView, setShowDailyView] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    minTrades: 0,
    minTradedDays: 0,
    equityFilter: 'all'
  })
  
  const observerRef = useRef<IntersectionObserver>(null)
  const loadingRef = useRef<HTMLDivElement>(null)

  // Helper function to count unique traded days
  const getTradedDays = (equityCurve: UserEquityData['equityCurve']) => {
    const uniqueDates = new Set(equityCurve.map(trade => trade.date))
    return uniqueDates.size
  }

  // Filter users based on criteria
  const filteredUsers = useMemo(() => additionalUsers.filter(user => {
    const tradedDays = getTradedDays(user.equityCurve)
    
    // Check minimum trades
    if (user.statistics.totalTrades < filters.minTrades) return false
    
    // Check minimum traded days
    if (tradedDays < filters.minTradedDays) return false
    
    // Check equity filter
    if (filters.equityFilter === 'positive' && user.statistics.totalPnL <= 0) return false
    if (filters.equityFilter === 'negative' && user.statistics.totalPnL >= 0) return false
    
    return true
  }), [additionalUsers, filters])

  const loadMoreUsers = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    setLoadError(null)
    try {
      const data = await getUserEquityData(currentPage, 10)
      
      // Store the user data for rendering
      setAdditionalUsers(prev => [...prev, ...data.users])
      setHasMore(data.hasMore)
      setCurrentPage(currentPage + 1)
    } catch (error) {
      console.error('Error loading more users:', error)
      setLoadError('Failed to load more users. Please try again.')
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

  const clearFilters = () => {
    setFilters({
      minTrades: 0,
      minTradedDays: 0,
      equityFilter: 'all'
    })
  }

  const hasActiveFilters = filters.minTrades > 0 || filters.minTradedDays > 0 || filters.equityFilter !== 'all'

  return (
    <>
      {/* View Toggle and Filters */}
      <div className="space-y-4 mb-6">
        {/* View Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
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
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Filters</h3>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs"
                >
                  <X className="h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Minimum Trades */}
              <div className="space-y-2">
                <Label htmlFor="min-trades" className="text-xs">Minimum Trades</Label>
                <Input
                  id="min-trades"
                  type="number"
                  min="0"
                  value={filters.minTrades}
                  onChange={(e) => setFilters(prev => ({ ...prev, minTrades: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="h-8"
                />
              </div>

              {/* Minimum Traded Days */}
              <div className="space-y-2">
                <Label htmlFor="min-days" className="text-xs">Minimum Traded Days</Label>
                <Input
                  id="min-days"
                  type="number"
                  min="0"
                  value={filters.minTradedDays}
                  onChange={(e) => setFilters(prev => ({ ...prev, minTradedDays: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="h-8"
                />
              </div>

              {/* Equity Filter */}
              <div className="space-y-2">
                <Label htmlFor="equity-filter" className="text-xs">Equity</Label>
                <Select
                  value={filters.equityFilter}
                  onValueChange={(value: 'all' | 'positive' | 'negative') => 
                    setFilters(prev => ({ ...prev, equityFilter: value }))
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Summary */}
            <div className="text-xs text-muted-foreground">
              Showing {filteredUsers.length} of {additionalUsers.length} users
              {hasActiveFilters && ` (filtered from ${additionalUsers.length} total)`}
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userCards}
        
        {/* Render additional users with proper charts */}
        {filteredUsers
          .filter(user => user.statistics.totalTrades > 0) // Only show users with trades
          .map((user, index) => {
            // Calculate trader number based on initial cards + current index
            const traderNumber = (initialUserCards?.length || 0) + index + 1
            const tradedDays = getTradedDays(user.equityCurve)
            
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
                    <p className="text-xs text-muted-foreground">
                      {tradedDays} days, {user.statistics.totalTrades} trades
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

      {/* Error display */}
      {loadError && (
        <div className="text-center py-4">
          <p className="text-sm text-red-500 mb-2">{loadError}</p>
          <Button onClick={loadMoreUsers} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      )}

      {/* End of results */}
      {!hasMore && (userCards.length > 0 || filteredUsers.length > 0) && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No more users to load
        </div>
      )}
    </>
  )
} 