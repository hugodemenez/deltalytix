"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, TooltipProps } from "recharts"
import { format, parseISO, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { Info, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

import { useData } from "@/context/data-provider"
import { useI18n } from "@/locales/client"
import { useUserStore } from "@/store/user-store"
import { useEquityChartStore } from "@/store/equity-chart-store"

interface EquityChartProps {
  size?: WidgetSize
}

interface ChartDataPoint {
  date: string
  [key: `equity_${string}`]: number // Dynamic keys for account equities
  equity?: number // For grouped view
  dailyPnL?: number | undefined
  dailyCommissions?: number | undefined
  netPnL?: number | undefined
}

interface AccountEquityInfo {
  accountNumber: string
  equity: number
  dailyPnL: number
  color: string
  distance?: number
  hadActivity?: boolean
}

// Optimized constants
const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Reduced color array for better performance
const ACCOUNT_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))", 
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
] as const

// Color map function
function createAccountColorMap(accountNumbers: string[]): Map<string, string> {
  const sortedAccounts = [...accountNumbers].sort()
  return new Map(sortedAccounts.map((accountNumber, index) => [
    accountNumber,
    ACCOUNT_COLORS[index % ACCOUNT_COLORS.length]
  ]))
}

// Optimized date boundary calculation - daily only
function useDateBoundaries(trades: any[], timezone: string) {
  return React.useMemo(() => {
    if (!trades.length) return { startDate: null, endDate: null, allDates: [] }

    const dates = trades.map(t => formatInTimeZone(new Date(t.entryDate), timezone, 'yyyy-MM-dd'))
    const startDate = dates.reduce((min, date) => date < min ? date : min)
    const endDate = dates.reduce((max, date) => date > max ? date : max)
    
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    end.setDate(end.getDate() + 1)
    
    return {
      startDate,
      endDate,
      allDates: eachDayOfInterval({ start, end })
    }
  }, [trades, timezone])
}

// High-performance chart data calculation - daily only
function useChartData(
  trades: any[], 
  accountNumbers: string[], 
  selectedAccounts: Set<string>,
  allDates: Date[],
  timezone: string,
  showIndividual: boolean,
  maxAccounts: number,
  dataSampling: 'all' | 'sample'
) {
  return React.useMemo(() => {
    if (!trades.length || !allDates.length) return []

    // Limit accounts for performance
    const limitedAccountNumbers = showIndividual 
      ? accountNumbers.slice(0, maxAccounts)
      : accountNumbers

    // Pre-filter trades to only selected accounts for better performance
    const filteredTrades = trades.filter(trade => 
      selectedAccounts.has(trade.accountNumber) && 
      limitedAccountNumbers.includes(trade.accountNumber)
    )
    
    // Data sampling for very large datasets
    const datesToProcess = dataSampling === 'sample' && allDates.length > 100
      ? allDates.filter((_, index) => index % 2 === 0) // Sample every other point
      : allDates

    // Pre-process trades by date for faster lookup
    const tradesMap = new Map<string, any[]>()
    
    filteredTrades.forEach(trade => {
      const dateKey = formatInTimeZone(new Date(trade.entryDate), timezone, 'yyyy-MM-dd')
      if (!tradesMap.has(dateKey)) {
        tradesMap.set(dateKey, [])
      }
      tradesMap.get(dateKey)!.push(trade)
    })

    // Use arrays instead of Maps for better performance with small datasets
    const accountEquities: Record<string, number> = {}
    limitedAccountNumbers.forEach(acc => accountEquities[acc] = 0)

    const chartData: ChartDataPoint[] = []

    datesToProcess.forEach(date => {
      const dateKey = formatInTimeZone(date, timezone, 'yyyy-MM-dd')
      const relevantTrades = tradesMap.get(dateKey) || []
      
      let totalEquity = 0
      const point: ChartDataPoint = { 
        date: dateKey,
        equity: 0 
      }

      if (showIndividual) {
        limitedAccountNumbers.forEach(acc => {
          point[`equity_${acc}`] = 0
        })
      }

      // Process trades for this period - optimized loop
      if (relevantTrades.length > 0) {
        // Group trades by account for single pass processing
        const tradesByAccount: Record<string, any[]> = {}
        relevantTrades.forEach(trade => {
          if (!tradesByAccount[trade.accountNumber]) {
            tradesByAccount[trade.accountNumber] = []
          }
          tradesByAccount[trade.accountNumber].push(trade)
        })

        // Process each account's trades
        for (const accountNumber of limitedAccountNumbers) {
          if (!selectedAccounts.has(accountNumber)) continue

          const accountTrades = tradesByAccount[accountNumber] || []
          const dailyPnL = accountTrades.reduce(
            (sum, trade) => sum + (trade.pnl - (trade.commission || 0)),
            0
          )

          accountEquities[accountNumber] += dailyPnL

          if (showIndividual) {
            point[`equity_${accountNumber}`] = accountEquities[accountNumber]
          }
          totalEquity += accountEquities[accountNumber]
        }
      } else {
        // No trades, carry forward previous equity values
        for (const accountNumber of limitedAccountNumbers) {
          if (!selectedAccounts.has(accountNumber)) continue

          if (showIndividual) {
            point[`equity_${accountNumber}`] = accountEquities[accountNumber]
          }
          totalEquity += accountEquities[accountNumber]
        }
      }

      if (!showIndividual) {
        point.equity = totalEquity
      }

      chartData.push(point)
    })

    return chartData
  }, [trades, accountNumbers, selectedAccounts, allDates, timezone, showIndividual, maxAccounts, dataSampling])
}

// Simplified tooltip component - only shows in grouped mode
const OptimizedTooltip = React.memo(({ 
  active, 
  payload, 
  data,
  showIndividual,
  size,
  accountColorMap,
  t,
  onHover
}: {
  active?: boolean
  payload?: any[]
  data?: ChartDataPoint
  showIndividual: boolean
  size: WidgetSize
  accountColorMap: Map<string, string>
  t: any
  onHover?: (data: ChartDataPoint | null) => void
}) => {
  // Only update hovered data for legend in individual mode
  React.useEffect(() => {
    if (onHover && showIndividual) {
      onHover(active && data ? data : null)
    }
  }, [active, data, onHover, showIndividual])

  // Don't show tooltip in individual mode - legend shows all the data
  if (showIndividual) return null

  if (!active || !payload || !payload.length || !data) return null

  // Only show tooltip in grouped mode
  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="grid gap-2">
        <div className="flex flex-col">
          <span className="text-[0.70rem] uppercase text-muted-foreground">
            {t('equity.tooltip.date')}
          </span>
          <span className="font-bold text-muted-foreground">
            {format(new Date(data.date), "MMM d, yyyy")}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[0.70rem] uppercase text-muted-foreground">
            {t('equity.tooltip.totalEquity')}
          </span>
          <span className="font-bold text-foreground">
            {formatCurrency(data.equity || 0)}
          </span>
        </div>
      </div>
    </div>
  )
})
OptimizedTooltip.displayName = "OptimizedTooltip"

// Dynamic legend component with horizontal scrolling
const AccountsLegend = React.memo(({ 
  accountNumbers,
  accountColorMap,
  selectedAccounts,
  chartData,
  hoveredData,
  t 
}: {
  accountNumbers: string[]
  accountColorMap: Map<string, string>
  selectedAccounts: Set<string>
  chartData: ChartDataPoint[]
  hoveredData: ChartDataPoint | null
  t: any
}) => {
  if (!accountNumbers.length || accountNumbers.length <= 1) return null

  // Use hovered data if available, otherwise use latest data
  const displayData = hoveredData || chartData[chartData.length - 1]
  const latestData = chartData[chartData.length - 1]
  const isHovered = !!hoveredData
  
  // Sort by latest equity values to maintain consistent order
  const accountsWithEquity = accountNumbers
    .filter(acc => selectedAccounts.has(acc))
    .map(acc => ({
      accountNumber: acc,
      equity: displayData?.[`equity_${acc}` as keyof ChartDataPoint] as number || 0,
      latestEquity: latestData?.[`equity_${acc}` as keyof ChartDataPoint] as number || 0,
      color: accountColorMap.get(acc) || ACCOUNT_COLORS[0]
    }))
    .sort((a, b) => b.latestEquity - a.latestEquity)

  return (
    <div className="border-t pt-2 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          {t('equity.legend.title')}
          {isHovered && displayData && (
            <span className="ml-2 text-xs text-primary">
              - {format(new Date(displayData.date), "MMM d, yyyy")}
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">
          ({accountsWithEquity.length} {t('equity.legend.accounts')})
        </span>
      </div>
              <div className="flex gap-3 overflow-x-auto pb-2 max-w-full">
        <div className="flex gap-3 min-w-max">
          {accountsWithEquity.slice(0, 20).map(({ accountNumber, equity, color }) => (
            <div key={accountNumber} className="flex items-center gap-1.5 flex-shrink-0">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground">
                  {accountNumber}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(equity)}
                </span>
              </div>
            </div>
          ))}
          {accountsWithEquity.length > 20 && (
            <div className="flex items-center gap-1.5 flex-shrink-0 text-xs text-muted-foreground">
              +{accountsWithEquity.length - 20} more
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
AccountsLegend.displayName = "AccountsLegend"

export default function EquityChart({ size = 'medium' }: EquityChartProps) {
  const { formattedTrades: trades } = useData()
  const timezone = useUserStore(state => state.timezone)
  const { config, setShowIndividual } = useEquityChartStore()
  const showIndividual = config.showIndividual
  const [hoveredData, setHoveredData] = React.useState<ChartDataPoint | null>(null)
  
  // Throttled hover handler for better performance
  const throttledSetHoveredData = React.useCallback(
    React.useMemo(() => {
      let timeoutId: NodeJS.Timeout | null = null
      return (data: ChartDataPoint | null) => {
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = setTimeout(() => setHoveredData(data), 16) // ~60fps
      }
    }, []),
    []
  )
  const yAxisRef = React.useRef<any>(null)
  const t = useI18n()

  // Use optimized hooks
  const { allDates } = useDateBoundaries(trades, timezone)
  
  const accountNumbers = React.useMemo(() => 
    Array.from(new Set(trades.map(trade => trade.accountNumber))),
    [trades]
  )

  const selectedAccounts = React.useMemo(() => 
    new Set(accountNumbers), 
    [accountNumbers]
  )

  const accountColorMap = React.useMemo(() => 
    createAccountColorMap(accountNumbers),
    [accountNumbers]
  )

  const chartData = useChartData(
    trades, 
    accountNumbers, 
    selectedAccounts, 
    allDates, 
    timezone, 
    showIndividual,
    config.maxAccountsDisplayed,
    config.dataSampling
  )

  // Optimized chart config with consistent color mapping
  const chartConfig = React.useMemo(() => {
    if (!showIndividual) {
      return {
        equity: {
          label: "Total Equity",
          color: "hsl(var(--chart-1))",
        }
      } as ChartConfig
    }
    
    const maxAccounts = config.maxAccountsDisplayed
    return accountNumbers.slice(0, maxAccounts).reduce((acc, accountNumber) => {
      acc[`equity_${accountNumber}`] = {
        label: `Account ${accountNumber}`,
        color: accountColorMap.get(accountNumber) || ACCOUNT_COLORS[0],
      }
      return acc
    }, {} as ChartConfig)
  }, [accountNumbers, showIndividual, config.maxAccountsDisplayed, accountColorMap])

  // Memoized chart lines with consistent color mapping
  const chartLines = React.useMemo(() => {
    if (!showIndividual) {
      return (
        <Line
          type="monotone"
          dataKey="equity"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          activeDot={{ r: 3, style: { fill: "hsl(var(--chart-2))" } }}
          stroke="hsl(var(--chart-2))"
          connectNulls={false}
        />
      )
    }

    const maxAccounts = config.maxAccountsDisplayed
    return accountNumbers.slice(0, maxAccounts).map((accountNumber) => {
      if (!selectedAccounts.has(accountNumber)) return null
      // Use the same color mapping as legend to ensure consistency
      const color = accountColorMap.get(accountNumber) || ACCOUNT_COLORS[0]
      return (
        <Line
          key={accountNumber}
          type="linear" // Linear is faster than monotone
          dataKey={`equity_${accountNumber}`}
          strokeWidth={1.5} // Thinner lines for better performance
          dot={false}
          isAnimationActive={false}
          activeDot={{ r: 3, style: { fill: color } }}
          stroke={color}
          connectNulls={false}
        />
      )
    }).filter(Boolean)
  }, [accountNumbers, selectedAccounts, showIndividual, config.maxAccountsDisplayed, accountColorMap])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader 
        className={cn(
          "flex flex-col items-stretch space-y-0 border-b shrink-0 h-[56px]",
          size === 'small' ? "p-2" : "p-3 sm:p-4"
        )}
      >
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-1.5">
            <CardTitle 
              className={cn(
                "line-clamp-1",
                size === 'small-long' ? "text-sm" : "text-base"
              )}
            >
              {t('equity.title')}
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('equity.description')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="view-mode"
              checked={showIndividual}
              onCheckedChange={setShowIndividual}
              className="shrink-0"
            />
            <Label 
              htmlFor="view-mode" 
              className="text-sm"
            >
              {t('equity.toggle.individual')}
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          "flex-1 min-h-0",
          size === 'small' ? "p-1" : "p-2 sm:p-4"
        )}
      >
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 min-h-0">
            <ChartContainer config={chartConfig} className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                data={chartData}
                margin={
                  size === 'small'
                    ? { left: 10, right: 4, top: 4, bottom: 20 }
                    : { left: 10, right: 8, top: 8, bottom: 24 }
                }
                onMouseLeave={() => setHoveredData(null)}
              >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    className="text-border dark:opacity-[0.12] opacity-[0.2]"
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    height={size === 'small' ? 20 : 24}
                    tickMargin={size === 'small' ? 4 : 8}
                    tick={{ 
                      fontSize: size === 'small' ? 9 : 11,
                      fill: 'currentColor'
                    }}
                    tickFormatter={(value) => format(new Date(value), "MMM d")}
                  />
                  <YAxis
                    ref={yAxisRef}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    tickMargin={4}
                    tick={{ 
                      fontSize: size === 'small' ? 9 : 11,
                      fill: 'currentColor'
                    }}
                    tickFormatter={formatCurrency}
                  />
                  <ChartTooltip
                    content={({ active, payload }: TooltipProps<number, string>) => (
                      <OptimizedTooltip
                        active={active}
                        payload={payload}
                        data={payload?.[0]?.payload as ChartDataPoint}
                        showIndividual={showIndividual}
                        size={size}
                        accountColorMap={accountColorMap}
                        t={t}
                        onHover={throttledSetHoveredData}
                      />
                    )}
                  />
                  {chartLines}
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          
          {showIndividual && accountNumbers.length > 1 && size !== 'small' && (
            <AccountsLegend
              accountNumbers={accountNumbers}
              accountColorMap={accountColorMap}
              selectedAccounts={selectedAccounts}
              chartData={chartData}
              hoveredData={hoveredData}
              t={t}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}