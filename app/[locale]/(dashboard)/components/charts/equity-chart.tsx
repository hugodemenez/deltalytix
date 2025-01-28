"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, TooltipProps } from "recharts"
import { format, parseISO, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { Info, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { WidgetSize } from '@/app/[locale]/(dashboard)/types/dashboard'
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

import { useFormattedTrades } from "../../../../../components/context/trades-data"
import { useI18n } from "@/locales/client"

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

// Generate a deterministic color based on account index
function generateAccountColor(accountIndex: number): string {
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
  const opacities = [1, 0.7, 0.4] // Different opacity levels for shades
  
  // First cycle through all colors
  const baseColorIndex = accountIndex % baseColors.length
  const baseColor = baseColors[baseColorIndex]
  
  // Only use opacity variations after cycling through all colors
  const opacityIndex = Math.floor(accountIndex / baseColors.length)
  const opacity = opacityIndex < opacities.length ? opacities[opacityIndex] : opacities[opacityIndex % opacities.length]

  // Return HSL color with opacity
  return `hsl(${baseColor.h} / ${opacity})`
}

export default function EquityChart({ size = 'medium' }: EquityChartProps) {
  const { formattedTrades: trades } = useFormattedTrades()
  const [showDailyPnL, setShowDailyPnL] = React.useState(true)
  const [showIndividual, setShowIndividual] = React.useState(false)
  const yAxisRef = React.useRef<any>(null)
  const t = useI18n()

  // Get unique account numbers
  const accountNumbers = React.useMemo(() => {
    return Array.from(new Set(trades.map(trade => trade.accountNumber)))
  }, [trades])

  // State for selected accounts - now managed by the parent component through filters
  const selectedAccounts = React.useMemo(() => new Set(accountNumbers), [accountNumbers])

  const chartConfig = React.useMemo(() => {
    if (!showIndividual) {
      return {
        equity: {
          label: "Total Equity",
          color: "hsl(var(--chart-1))",
        }
      } as ChartConfig
    }
    // Ensure consistent order of accounts
    const sortedAccounts = [...accountNumbers].sort()
    return sortedAccounts.reduce((acc, accountNumber, index) => {
      acc[`equity_${accountNumber}`] = {
        label: `Account ${accountNumber}`,
        color: generateAccountColor(index),
      }
      return acc
    }, {} as ChartConfig)
  }, [accountNumbers, showIndividual])

  const chartData = React.useMemo(() => {
    if (!trades.length) return []

    // Find the global start date (earliest trade) in UTC
    const startDate = new Date(Math.min(...trades.map(t => new Date(t.entryDate).getTime())))
    const endDate = new Date(Math.max(...trades.map(t => new Date(t.entryDate).getTime())))
    const allDates = eachDayOfInterval({ 
      start: startOfDay(startDate), 
      end: endOfDay(endDate) 
    })

    // Initialize the result with all dates and accounts
    const dateMap = new Map<string, ChartDataPoint>()
    allDates.forEach(date => {
      const dateStr = formatInTimeZone(date, 'UTC', 'yyyy-MM-dd')
      const point: ChartDataPoint = {
        date: dateStr,
        equity: 0
      }
      // Initialize all account equities to null to ensure proper line rendering
      accountNumbers.forEach(acc => {
        point[`equity_${acc}`] = 0
      })
      dateMap.set(dateStr, point)
    })

    // Process trades by account
    accountNumbers.forEach(accountNumber => {
      if (!selectedAccounts.has(accountNumber)) return

      const accountTrades = trades.filter(t => t.accountNumber === accountNumber)
      if (!accountTrades.length) return

      let accountEquity = 0
      const accountStartDate = new Date(Math.min(...accountTrades.map(t => new Date(t.entryDate).getTime())))

      allDates.forEach(date => {
        const dateStr = formatInTimeZone(date, 'UTC', 'yyyy-MM-dd')
        const dayStart = new Date(formatInTimeZone(startOfDay(date), 'UTC', "yyyy-MM-dd'T'00:00:00'Z'"))
        const dayEnd = new Date(formatInTimeZone(endOfDay(date), 'UTC', "yyyy-MM-dd'T'23:59:59.999'Z'"))

        const point = dateMap.get(dateStr)!

        // Get all trades for this day using UTC boundaries
        const dayTrades = accountTrades.filter(trade => {
          const tradeDate = new Date(trade.entryDate)
          return tradeDate >= dayStart && tradeDate <= dayEnd
        })

        // Calculate daily PnL and update equity
        const dailyPnL = dayTrades.reduce((sum, trade) => sum + (trade.pnl - (trade.commission || 0)), 0)
        accountEquity += dailyPnL

        // Update the data point
        if (showIndividual) {
          point[`equity_${accountNumber}`] = accountEquity
        } else {
          point.equity = (point.equity || 0) + accountEquity
        }
      })
    })

    return Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [trades, accountNumbers, selectedAccounts, showIndividual])

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
                      const accountEquities: AccountEquityInfo[] = [...accountNumbers]
                        .sort()
                        .map((accountNumber, index) => {
                          const equity = data[`equity_${accountNumber}`] as number
                          // Find the previous day's data point
                          const currentIndex = chartData.findIndex(d => d.date === data.date)
                          const previousDayData = currentIndex > 0 ? chartData[currentIndex - 1] : null
                          const previousEquity = previousDayData ? previousDayData[`equity_${accountNumber}`] as number : 0
                          const hadActivity = equity !== previousEquity
                          const dailyPnL = equity - previousEquity

                          return {
                            accountNumber,
                            equity,
                            dailyPnL,
                            color: generateAccountColor(index),
                            distance: Math.abs(equity - (cursorValue || equity)),
                            hadActivity
                          }
                        })
                        .filter(acc => {
                          // Only show accounts that had activity on this specific day
                          return selectedAccounts.has(acc.accountNumber) && acc.hadActivity
                        })
                        .sort((a, b) => a.distance - b.distance) // Sort by distance to cursor value
                        .slice(0, 5) // Take only the 5 closest accounts

                      // Calculate statistics for all accounts with activity this day
                      const allAccountEquities = [...accountNumbers]
                        .sort()
                        .map((accountNumber, index) => {
                          const equity = data[`equity_${accountNumber}`] as number
                          // Find the previous day's data point
                          const currentIndex = chartData.findIndex(d => d.date === data.date)
                          const previousDayData = currentIndex > 0 ? chartData[currentIndex - 1] : null
                          const previousEquity = previousDayData ? previousDayData[`equity_${accountNumber}`] as number : 0
                          const hadActivity = equity !== previousEquity
                          const dailyPnL = equity - previousEquity

                          return {
                            accountNumber,
                            equity,
                            dailyPnL,
                            color: generateAccountColor(index),
                            hadActivity
                          }
                        })
                        .filter(acc => {
                          // Only include accounts with activity on this specific day
                          return selectedAccounts.has(acc.accountNumber) && acc.hadActivity
                        })

                      const totalAccounts = allAccountEquities.length
                      const totalDailyPnL = allAccountEquities.reduce((sum, acc) => sum + acc.dailyPnL, 0)
                      const averageDailyPnL = totalDailyPnL / totalAccounts
                      const highestDailyPnL = Math.max(...allAccountEquities.map(acc => acc.dailyPnL))
                      const lowestDailyPnL = Math.min(...allAccountEquities.map(acc => acc.dailyPnL))

                      // Show "No PnL" message if no accounts with PnL are found
                      if (accountEquities.length === 0) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[200px]">
                            <div className="grid gap-2">
                              {/* Date */}
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {t('equity.tooltip.date')}
                                </span>
                                <span className="font-bold text-muted-foreground text-xs">
                                  {format(new Date(data.date), "MMM d, yyyy")}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {t('equity.tooltip.noActivity')}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      }

                      // For small size, show a compact version
                      if (size === 'small') {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[200px]">
                            <div className="grid gap-2">
                              {/* Date */}
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {t('equity.tooltip.date')}
                                </span>
                                <span className="font-bold text-muted-foreground text-xs">
                                  {format(new Date(data.date), "MMM d, yyyy")}
                                </span>
                              </div>

                              {/* Closest Accounts */}
                              <div className="grid grid-cols-1 gap-1.5">
                                {accountEquities.map(({ accountNumber, equity, dailyPnL, color }) => (
                                  <div key={accountNumber} className="flex justify-between items-center gap-2">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground whitespace-nowrap">
                                      {accountNumber}
                                    </span>
                                    <div className="flex flex-col items-end">
                                      <span className="font-bold text-xs" style={{ color }}>
                                        {formatCurrency(equity)}
                                      </span>
                                      <span className="text-[0.70rem] text-muted-foreground">
                                        {dailyPnL >= 0 ? '+' : ''}{formatCurrency(dailyPnL)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      }

                      // Regular size tooltip
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[280px]">
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

                            {/* Summary Statistics */}
                            <div className="grid grid-cols-2 gap-2 border-t pt-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {t('equity.tooltip.activeAccounts')}
                                </span>
                                <span className="font-bold">{totalAccounts}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {t('equity.tooltip.averageDailyPnL')}
                                </span>
                                <span className="font-bold">{formatCurrency(averageDailyPnL)}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {t('equity.tooltip.highestDailyPnL')}
                                </span>
                                <span className="font-bold">{formatCurrency(highestDailyPnL)}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {t('equity.tooltip.lowestDailyPnL')}
                                </span>
                                <span className="font-bold">{formatCurrency(lowestDailyPnL)}</span>
                              </div>
                            </div>

                            {/* Closest Accounts */}
                            <div className="border-t pt-2">
                              <span className="text-[0.70rem] uppercase text-muted-foreground mb-1.5 block">
                                {t('equity.tooltip.accountSummary')}
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                {accountEquities.map(({ accountNumber, equity, dailyPnL, color }) => (
                                  <div key={accountNumber} className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      Account {accountNumber}
                                    </span>
                                    <span className="font-bold" style={{ color }}>
                                      {formatCurrency(equity)}
                                    </span>
                                    <span className="text-[0.70rem] text-muted-foreground">
                                      {dailyPnL >= 0 ? '+' : ''}{formatCurrency(dailyPnL)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                {showIndividual ? (
                  [...accountNumbers].sort().map((accountNumber, index) => {
                    if (!selectedAccounts.has(accountNumber)) return null
                    const color = generateAccountColor(index)
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
                      style: { fill: "hsl(var(--chart-1))" }
                    }}
                    stroke="hsl(var(--chart-1))"
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