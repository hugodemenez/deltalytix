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
import { useUserStore } from "../../../../../store/user-store"

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

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Move account color generation outside component
const ACCOUNT_COLORS = Array.from({ length: 24 }, (_, index) => {
  const baseColors = [
    { h: "var(--chart-1)", color: "hsl(var(--chart-1))" },
    { h: "var(--chart-2)", color: "hsl(var(--chart-2))" },
    { h: "var(--chart-3)", color: "hsl(var(--chart-3))" },
    { h: "var(--chart-4)", color: "hsl(var(--chart-4))" },
    { h: "var(--chart-5)", color: "hsl(var(--chart-5))" },
    { h: "var(--chart-6)", color: "hsl(var(--chart-6))" },
    { h: "var(--chart-7)", color: "hsl(var(--chart-7))" },
    { h: "var(--chart-8)", color: "hsl(var(--chart-8))" },
  ]
  const opacities = [1, 0.7, 0.4]
  const baseColorIndex = index % baseColors.length
  const baseColor = baseColors[baseColorIndex]
  const opacityIndex = Math.floor(index / baseColors.length)
  const opacity = opacityIndex < opacities.length ? opacities[opacityIndex] : opacities[opacityIndex % opacities.length]
  return `hsl(${baseColor.h} / ${opacity})`
})

// Create a stable color map based on account numbers
function createAccountColorMap(accountNumbers: string[]): Map<string, string> {
  const sortedAccounts = [...accountNumbers].sort()
  return new Map(sortedAccounts.map((accountNumber, index) => [
    accountNumber,
    ACCOUNT_COLORS[index % ACCOUNT_COLORS.length]
  ]))
}

export default function EquityChart({ size = 'medium' }: EquityChartProps) {
  const { formattedTrades: trades } = useData()
  const timezone = useUserStore(state => state.timezone)
  const [showDailyPnL, setShowDailyPnL] = React.useState(true)
  const [showIndividual, setShowIndividual] = React.useState(true)
  const yAxisRef = React.useRef<any>(null)
  const t = useI18n()

  // Memoize date boundaries
  const { startDate, endDate, allDates } = React.useMemo(() => {
    if (!trades.length) return { startDate: null, endDate: null, allDates: [] }

    // Parse the dates using the user's timezone
    const dates = trades.map(t => {
      const date = new Date(t.entryDate)
      return formatInTimeZone(date, timezone, 'yyyy-MM-dd')
    })
    const startDate = dates.reduce((min, date) => date < min ? date : min)
    const endDate = dates.reduce((max, date) => date > max ? date : max)
    
    // Create array of dates between start and end
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    end.setDate(end.getDate() + 1) // Include the end date
    
    return {
      startDate,
      endDate,
      allDates: eachDayOfInterval({ start, end })
    }
  }, [trades, timezone])

  // Get unique account numbers
  const accountNumbers = React.useMemo(() => {
    return Array.from(new Set(trades.map(trade => trade.accountNumber)))
  }, [trades])

  // State for selected accounts - now managed by the parent component through filters
  const selectedAccounts = React.useMemo(() => new Set(accountNumbers), [accountNumbers])

  // Create a stable color map for accounts
  const accountColorMap = React.useMemo(() => 
    createAccountColorMap(accountNumbers),
    [accountNumbers]
  )

  // Memoize trades by account
  const tradesByAccount = React.useMemo(() => {
    return accountNumbers.reduce((acc, accountNumber) => {
      acc[accountNumber] = trades.filter(t => t.accountNumber === accountNumber)
      return acc
    }, {} as Record<string, typeof trades>)
  }, [trades, accountNumbers])

  // Pre-compute date strings for all dates
  const dateStringsMap = React.useMemo(() => {
    const map = new Map<Date, string>()
    allDates.forEach(date => {
      map.set(date, formatInTimeZone(date, timezone, 'yyyy-MM-dd'))
    })
    return map
  }, [allDates, timezone])

  // Memoize chart config
  const chartConfig = React.useMemo(() => {
    if (!showIndividual) {
      return {
        equity: {
          label: "Total Equity",
          color: "hsl(var(--chart-1))",
        }
      } as ChartConfig
    }
    const sortedAccounts = [...accountNumbers].sort()
    return sortedAccounts.reduce((acc, accountNumber) => {
      acc[`equity_${accountNumber}`] = {
        label: `Account ${accountNumber}`,
        color: accountColorMap.get(accountNumber)!,
      }
      return acc
    }, {} as ChartConfig)
  }, [accountNumbers, showIndividual, accountColorMap])

  // Memoize initial data points map
  const initialDateMap = React.useMemo(() => {
    if (!allDates.length) return new Map<string, ChartDataPoint>()

    const dateMap = new Map<string, ChartDataPoint>()
    allDates.forEach(date => {
      const dateStr = dateStringsMap.get(date)!
      const point: ChartDataPoint = {
        date: dateStr,
        equity: 0
      }
      accountNumbers.forEach(acc => {
        point[`equity_${acc}`] = 0
      })
      dateMap.set(dateStr, point)
    })
    return dateMap
  }, [allDates, accountNumbers, dateStringsMap])

  // Memoize chart data calculation
  const chartData = React.useMemo(() => {
    if (!trades.length || !initialDateMap.size) return []

    const dateMap = new Map(initialDateMap)

    // Create a map to store cumulative equity for each account
    const accountEquities = new Map<string, number>()
    accountNumbers.forEach(acc => accountEquities.set(acc, 0))

    // Process trades chronologically
    const sortedDates = Array.from(dateMap.keys()).sort()
    
    sortedDates.forEach(dateStr => {
      const point = dateMap.get(dateStr)!
      let totalEquity = 0

      // Get all trades for this date
      const dateTrades = trades.filter(trade => {
        const tradeDate = formatInTimeZone(new Date(trade.entryDate), timezone, 'yyyy-MM-dd')
        return tradeDate === dateStr && selectedAccounts.has(trade.accountNumber)
      })

      // Process each account
      accountNumbers.forEach(accountNumber => {
        if (!selectedAccounts.has(accountNumber)) return

        // Get current account equity
        let accountEquity = accountEquities.get(accountNumber) || 0

        // Calculate daily PnL for this account
        const accountDayTrades = dateTrades.filter(t => t.accountNumber === accountNumber)
        const dailyPnL = accountDayTrades.reduce(
          (sum, trade) => sum + (trade.pnl - (trade.commission || 0)),
          0
        )

        // Update account equity
        accountEquity += dailyPnL
        accountEquities.set(accountNumber, accountEquity)

        // Update point data
        if (showIndividual) {
          point[`equity_${accountNumber}`] = accountEquity
        }
        totalEquity += accountEquity
      })

      // Set total equity if not showing individual accounts
      if (!showIndividual) {
        point.equity = totalEquity
      }
    })

    return sortedDates.map(date => dateMap.get(date)!)
  }, [trades, initialDateMap, accountNumbers, selectedAccounts, showIndividual, timezone])

  // Memoize tooltip data preparation with pre-computed values
  const tooltipDataCache = React.useRef(new Map<string, AccountEquityInfo[]>())
  
  const getTooltipData = React.useCallback((data: ChartDataPoint, cursorValue?: number) => {
    if (!showIndividual) return null

    // Check cache first
    const cacheKey = `${data.date}-${cursorValue}`
    if (tooltipDataCache.current.has(cacheKey)) {
      return tooltipDataCache.current.get(cacheKey)!
    }

    const accountEquities: AccountEquityInfo[] = [...accountNumbers]
      .sort()
      .map((accountNumber) => {
        const equity = data[`equity_${accountNumber}`] as number
        const currentIndex = chartData.findIndex(d => d.date === data.date)
        const previousDayData = currentIndex > 0 ? chartData[currentIndex - 1] : null
        const previousEquity = previousDayData ? previousDayData[`equity_${accountNumber}`] as number : 0
        const hadActivity = equity !== previousEquity
        const dailyPnL = equity - previousEquity

        return {
          accountNumber,
          equity,
          dailyPnL,
          color: accountColorMap.get(accountNumber)!,
          distance: cursorValue ? Math.abs(equity - cursorValue) : 0,
          hadActivity
        }
      })
      .filter(acc => selectedAccounts.has(acc.accountNumber) && acc.hadActivity)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)

    // Cache the result
    tooltipDataCache.current.set(cacheKey, accountEquities)
    
    // Clear cache if it gets too large
    if (tooltipDataCache.current.size > 1000) {
      tooltipDataCache.current.clear()
    }

    return accountEquities
  }, [accountNumbers, selectedAccounts, showIndividual, chartData, accountColorMap])

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
        <div className={cn(
          "w-full h-full"
        )}>
          <ChartContainer
            config={chartConfig}
            className={cn(
              "w-full h-full"
            )}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={
                  size === 'small'
                    ? { left: 10, right: 4, top: 4, bottom: 20 }
                    : { left: 10, right: 8, top: 8, bottom: 24 }
                }
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
                  content={({ active, payload, coordinate }: TooltipProps<number, string>) => {
                    if (active && payload && payload.length && coordinate?.y !== undefined && yAxisRef.current) {
                      const data = payload[0].payload as ChartDataPoint
                      
                      if (!showIndividual) {
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
                      }

                      // Get the Y scale from the YAxis ref
                      const yScale = yAxisRef.current?.scale
                      const cursorValue = yScale?.invert?.(coordinate.y)

                      // Get all account equities and find closest to cursor
                      const accountEquities = getTooltipData(data, cursorValue)

                      // Calculate summary statistics for all accounts
                      const allAccountEquities = [...accountNumbers]
                        .filter(acc => selectedAccounts.has(acc))
                        .map((accountNumber, index) => {
                          const equity = data[`equity_${accountNumber}`] as number
                          const currentIndex = chartData.findIndex(d => d.date === data.date)
                          const previousDayData = currentIndex > 0 ? chartData[currentIndex - 1] : null
                          const previousEquity = previousDayData ? previousDayData[`equity_${accountNumber}`] as number : 0
                          const dailyPnL = equity - previousEquity
                          return { 
                            accountNumber, 
                            equity, 
                            dailyPnL,
                            color: accountColorMap.get(accountNumber)!,
                            hadActivity: dailyPnL !== 0
                          }
                        })
                        // Sort by activity first, then by equity
                        .sort((a, b) => {
                          if (a.hadActivity !== b.hadActivity) {
                            return b.hadActivity ? 1 : -1 // Active accounts first
                          }
                          return b.equity - a.equity // Then by equity descending
                        })
                        .slice(0, 5) // Take only top 5 accounts

                      const totalEquity = allAccountEquities.reduce((sum, acc) => sum + acc.equity, 0)
                      const totalDailyPnL = allAccountEquities.reduce((sum, acc) => sum + acc.dailyPnL, 0)
                      const totalAccounts = allAccountEquities.length
                      const averageDailyPnL = totalDailyPnL / totalAccounts

                      // For small size, show a minimal version with only essential info
                      if (size === 'small' || size === 'tiny') {
                        return (
                          <div className="rounded-lg border bg-background p-1.5 shadow-sm min-w-[160px]">
                            <div className="grid gap-1">
                              {/* Date */}
                              <div className="flex items-center justify-between">
                                <span className="text-[0.65rem] text-muted-foreground">
                                  {format(new Date(data.date), "MMM d")}
                                </span>
                              </div>

                              {/* Summary */}
                              <div className="flex items-center justify-between">
                                <span className="text-[0.65rem] text-muted-foreground">
                                  {t('equity.tooltip.totalEquity')}
                                </span>
                                <span className="text-xs font-medium">
                                  {formatCurrency(totalEquity)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between border-t pt-1">
                                <span className="text-[0.65rem] text-muted-foreground">
                                  {t('equity.tooltip.totalDailyPnL')}
                                </span>
                                <span className={cn(
                                  "text-xs font-medium",
                                  totalDailyPnL > 0 ? "text-green-500" : totalDailyPnL < 0 ? "text-red-500" : "text-muted-foreground"
                                )}>
                                  {totalDailyPnL >= 0 ? '+' : ''}{formatCurrency(totalDailyPnL)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      }

                      // Medium size - show more details but still compact
                      if (size === 'small-long' || size === 'medium') {
                        return (
                          <div className="rounded-lg border bg-background p-1.5 shadow-sm min-w-[240px]">
                            <div className="grid gap-1.5">
                              {/* Date and Total Equity */}
                              <div className="flex items-center justify-between">
                                <span className="text-[0.65rem] text-muted-foreground">
                                  {format(new Date(data.date), "MMM d, yyyy")}
                                </span>
                                <span className="text-xs font-medium">
                                  {formatCurrency(totalEquity)}
                                </span>
                              </div>

                              {/* Daily PnL */}
                              <div className="flex items-center justify-between border-t pt-1">
                                <span className="text-[0.65rem] text-muted-foreground">
                                  {t('equity.tooltip.totalDailyPnL')}
                                </span>
                                <span className={cn(
                                  "text-xs font-medium",
                                  totalDailyPnL > 0 ? "text-green-500" : totalDailyPnL < 0 ? "text-red-500" : "text-foreground"
                                )}>
                                  {totalDailyPnL >= 0 ? '+' : ''}{formatCurrency(totalDailyPnL)}
                                </span>
                              </div>

                              {/* Account Details */}
                              {showIndividual && allAccountEquities.length > 0 && (
                                <div className="border-t pt-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[0.65rem] text-muted-foreground">
                                      {t('equity.tooltip.accountDetails')}
                                    </span>
                                    {totalAccounts > 5 && (
                                      <span className="text-[0.60rem] text-muted-foreground">
                                        {t('equity.tooltip.showingTopAccounts', { count: Math.min(5, allAccountEquities.length), total: totalAccounts })}
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid gap-1">
                                    {allAccountEquities.map(({ accountNumber, equity, dailyPnL, color, hadActivity }) => (
                                      <div key={accountNumber} className="flex justify-between items-center">
                                        <span className={cn(
                                          "text-[0.65rem]",
                                          hadActivity ? "text-foreground" : "text-muted-foreground"
                                        )}>
                                          {accountNumber}
                                        </span>
                                        <div className="flex gap-2 items-center">
                                          <span className="text-[0.65rem] font-medium" style={{ color }}>
                                            {formatCurrency(equity)}
                                          </span>
                                          <span className={cn(
                                            "text-[0.60rem]",
                                            dailyPnL > 0 ? "text-green-500" : dailyPnL < 0 ? "text-red-500" : "text-muted-foreground"
                                          )}>
                                            {dailyPnL >= 0 ? '+' : ''}{formatCurrency(dailyPnL)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      }

                      // Large size - show full details
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[320px]">
                          <div className="grid gap-3">
                            {/* Date */}
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                {t('equity.tooltip.date')}
                              </span>
                              <span className="font-bold text-muted-foreground">
                                {format(new Date(data.date), "MMM d, yyyy")}
                              </span>
                            </div>

                            {/* Portfolio Summary */}
                            <div className="grid grid-cols-2 gap-2 border-t pt-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {t('equity.tooltip.totalEquity')}
                                </span>
                                <span className="font-bold">{formatCurrency(totalEquity)}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {t('equity.tooltip.totalDailyPnL')}
                                </span>
                                <span className={cn(
                                  "font-bold",
                                  totalDailyPnL > 0 ? "text-green-500" : totalDailyPnL < 0 ? "text-red-500" : "text-foreground"
                                )}>
                                  {totalDailyPnL >= 0 ? '+' : ''}{formatCurrency(totalDailyPnL)}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {t('equity.tooltip.totalAccounts')}
                                </span>
                                <span className="font-bold">{totalAccounts}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {t('equity.tooltip.averageDailyPnL')}
                                </span>
                                <span className={cn(
                                  "font-bold",
                                  averageDailyPnL > 0 ? "text-green-500" : averageDailyPnL < 0 ? "text-red-500" : "text-foreground"
                                )}>
                                  {averageDailyPnL >= 0 ? '+' : ''}{formatCurrency(averageDailyPnL)}
                                </span>
                              </div>
                            </div>

                            {/* All Accounts Details (max 5) */}
                            {showIndividual && allAccountEquities.length > 0 && (
                              <div className="border-t pt-2">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">
                                    {t('equity.tooltip.accountDetails')}
                                  </span>
                                  {totalAccounts > 5 && (
                                    <span className="text-[0.65rem] text-muted-foreground">
                                      {t('equity.tooltip.showingTopAccounts', { count: Math.min(5, allAccountEquities.length), total: totalAccounts })}
                                    </span>
                                  )}
                                </div>
                                <div className="grid gap-2">
                                  {allAccountEquities.map(({ accountNumber, equity, dailyPnL, color, hadActivity }) => (
                                    <div key={accountNumber} className="flex justify-between items-center">
                                      <span className={cn(
                                        "text-[0.70rem] uppercase",
                                        hadActivity ? "text-foreground" : "text-muted-foreground"
                                      )}>
                                        {accountNumber}
                                      </span>
                                      <div className="flex flex-col items-end">
                                        <span className="font-bold" style={{ color }}>
                                          {formatCurrency(equity)}
                                        </span>
                                        <span className={cn(
                                          "text-[0.70rem]",
                                          dailyPnL > 0 ? "text-green-500" : dailyPnL < 0 ? "text-red-500" : "text-muted-foreground"
                                        )}>
                                          {dailyPnL >= 0 ? '+' : ''}{formatCurrency(dailyPnL)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                {showIndividual ? (
                  [...accountNumbers].sort().map((accountNumber) => {
                    if (!selectedAccounts.has(accountNumber)) return null
                    const color = accountColorMap.get(accountNumber)!
                    return (
                      <Line
                        key={accountNumber}
                        type="monotone"
                        dataKey={`equity_${accountNumber}`}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                        activeDot={{
                          r: 4,
                          style: { fill: color }
                        }}
                        stroke={color}
                      />
                    )
                  })
                ) : (
                  <Line
                    type="monotone"
                    dataKey="equity"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    activeDot={{
                      r: 4,
                      style: { fill: "hsl(var(--chart-2))" }
                    }}
                    stroke="hsl(var(--chart-2))"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}