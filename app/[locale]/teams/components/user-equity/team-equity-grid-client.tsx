'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { getTeamEquityData, exportTeamTradesAction } from '../../actions/stats'
import { Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { UserEquityChart } from './user-equity-chart'
import { ExternalLink, Download } from 'lucide-react'
import Link from 'next/link'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Filter, X } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { toast } from 'sonner'

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

interface TeamEquityGridClientProps {
  teamId: string
}

interface Filters {
  minTrades: number
  minTradedDays: number
  equityFilter: 'all' | 'positive' | 'negative'
}

export function TeamEquityGridClient({ teamId }: TeamEquityGridClientProps) {
  const t = useI18n()
  const [users, setUsers] = useState<UserEquityData[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [showDailyView, setShowDailyView] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
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
  const filteredUsers = users.filter(user => {
    const tradedDays = getTradedDays(user.equityCurve)
    
    // Check minimum trades
    if (user.statistics.totalTrades < filters.minTrades) return false
    
    // Check minimum traded days
    if (tradedDays < filters.minTradedDays) return false
    
    // Check equity filter
    if (filters.equityFilter === 'positive' && user.statistics.totalPnL <= 0) return false
    if (filters.equityFilter === 'negative' && user.statistics.totalPnL >= 0) return false
    
    return true
  })

  const loadMoreUsers = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const data = await getTeamEquityData(teamId, currentPage, 10)
      
      // Store the user data for rendering
      setUsers(prev => [...prev, ...data.users])
      setHasMore(data.hasMore)
      setCurrentPage(currentPage + 1)
    } catch (error) {
      console.error('Error loading more users:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [teamId, currentPage, hasMore, isLoadingMore])

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setIsInitialLoading(true)
      try {
        const data = await getTeamEquityData(teamId, 1, 10)
        setUsers(data.users)
        setHasMore(data.hasMore)
        setCurrentPage(2)
      } catch (error) {
        console.error('Error loading initial data:', error)
      } finally {
        setIsInitialLoading(false)
      }
    }

    loadInitialData()
  }, [teamId])

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

  const handleExportTrades = async () => {
    setIsExporting(true)
    try {
      const csv = await exportTeamTradesAction(teamId)
      
      // Create a blob and download the CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `team-trades-${teamId}-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success(t('teams.equity.exportSuccess'))
    } catch (error) {
      console.error('Error exporting trades:', error)
      toast.error(t('teams.equity.exportError'))
    } finally {
      setIsExporting(false)
    }
  }

  const hasActiveFilters = filters.minTrades > 0 || filters.minTradedDays > 0 || filters.equityFilter !== 'all'

  if (isInitialLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

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
              {showDailyView ? t('teams.equity.dailyView') : t('teams.equity.tradeView')}
            </Label>
            <span className="text-xs text-muted-foreground ml-2">
              {showDailyView ? t('teams.equity.groupedByDay') : t('teams.equity.individualTrades')}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportTrades}
              disabled={isExporting || users.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? t('teams.equity.exporting') : t('teams.equity.exportTrades')}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {t('teams.equity.filters')}
              {hasActiveFilters && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{t('teams.equity.filters')}</h3>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs"
                >
                  <X className="h-3 w-3" />
                  {t('teams.equity.clear')}
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Minimum Trades */}
              <div className="space-y-2">
                <Label htmlFor="min-trades" className="text-xs">{t('teams.equity.minimumTrades')}</Label>
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
                <Label htmlFor="min-days" className="text-xs">{t('teams.equity.minimumTradedDays')}</Label>
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
                <Label htmlFor="equity-filter" className="text-xs">{t('teams.equity.equity')}</Label>
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
                    <SelectItem value="all">{t('teams.equity.all')}</SelectItem>
                    <SelectItem value="positive">{t('teams.equity.positive')}</SelectItem>
                    <SelectItem value="negative">{t('teams.equity.negative')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Summary */}
            <div className="text-xs text-muted-foreground">
              {hasActiveFilters && ` (${t('teams.equity.filteredFrom')} ${users.length} ${t('teams.equity.total')})`}
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Render users with proper charts */}
        {filteredUsers
          .filter(user => user.statistics.totalTrades > 0) // Only show users with trades
          .map((user, index) => {
            const tradedDays = getTradedDays(user.equityCurve)
            
            return (
              <Card key={user.userId} className="p-4 space-y-4">
                {/* User Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">
                      {user.email}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(t as any)('teams.equity.tradeStats', { 
                        days: tradedDays, 
                        trades: user.statistics.totalTrades 
                      })}
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
                      href={`/teams/dashboard/trader/${user.userId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title={t('teams.equity.viewTraderDetails')}
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
                      <span className="text-muted-foreground">{t('teams.equity.trades')}:</span>
                      <span className="font-medium">{user.statistics.totalTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('teams.equity.winRate')}:</span>
                      <span className="font-medium">{user.statistics.winRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('teams.equity.avgWin')}:</span>
                      <span className="font-medium text-green-600">
                        {user.statistics.averageWin.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('teams.equity.wins')}:</span>
                      <span className="font-medium text-green-600">{user.statistics.winningTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('teams.equity.losses')}:</span>
                      <span className="font-medium text-red-600">{user.statistics.losingTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('teams.equity.avgLoss')}:</span>
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
                      <span className="text-muted-foreground">{t('teams.equity.maxDD')}:</span>
                      <span className="font-medium text-red-600">
                        {user.statistics.maxDrawdown.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('teams.equity.profitFactor')}:</span>
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
            <div className="text-sm text-muted-foreground">{t('teams.equity.scrollToLoadMore')}</div>
          )}
        </div>
      )}

      {/* End of results */}
      {!hasMore && filteredUsers.length > 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          {t('teams.equity.noMoreUsers')}
        </div>
      )}

      {/* No results */}
      {!isInitialLoading && filteredUsers.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          {t('teams.equity.noUsersFound')}
        </div>
      )}
    </>
  )
} 