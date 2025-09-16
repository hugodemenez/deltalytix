"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, TooltipProps, ReferenceLine } from "recharts"
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
import { Payout as PrismaPayout } from '@prisma/client'

interface EquityChartProps {
  size?: WidgetSize
}

interface ChartDataPoint {
  date: string
  [key: `equity_${string}`]: number | undefined // Dynamic keys for account equities
  equity?: number // For grouped view
  dailyPnL?: number | undefined
  dailyCommissions?: number | undefined
  netPnL?: number | undefined
  // Payout and reset indicators
  [key: `payout_${string}`]: boolean // Payout indicators for each account
  [key: `reset_${string}`]: boolean // Reset indicators for each account
  [key: `payoutStatus_${string}`]: string // Payout status for each account
  [key: `payoutAmount_${string}`]: number // Payout amount for each account
}

interface AccountEquityInfo {
  accountNumber: string
  equity: number
  dailyPnL: number
  color: string
  distance?: number
  hadActivity?: boolean
}

// Chart event interface for payouts and resets
interface ChartEvent {
  date: Date
  amount: number
  isPayout: boolean
  isReset?: boolean
  payoutStatus?: string
  accountNumber: string
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

// Get payout color based on status
const getPayoutColor = (status: string) => {
  switch (status) {
    case 'PENDING': return '#9CA3AF'
    case 'VALIDATED': return '#F97316'
    case 'REFUSED': return '#DC2626'
    case 'PAID': return '#16A34A'
    default: return '#9CA3AF'
  }
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

// High-performance chart data calculation with payouts and resets
function useChartData(
  trades: any[], 
  accounts: any[],
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

    // Create account map for quick lookup
    const accountMap = new Map(accounts.map(acc => [acc.number, acc]))

    // Filter trades based on reset dates and selected accounts
    const filteredTrades = trades.filter(trade => {
      if (!selectedAccounts.has(trade.accountNumber) || 
          !limitedAccountNumbers.includes(trade.accountNumber)) {
        return false
      }
      
      const account = accountMap.get(trade.accountNumber)
      if (!account) return true // Include if account not found
      
      // Filter based on reset date if it exists
      if (account.resetDate) {
        return new Date(trade.entryDate) >= new Date(account.resetDate)
      }
      
      return true
    })
    
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

    // Create combined events array with trades, payouts, and resets
    const allEvents: ChartEvent[] = []
    
    // Add trades
    filteredTrades.forEach(trade => {
      allEvents.push({
        date: new Date(trade.entryDate),
        amount: trade.pnl - (trade.commission || 0),
        isPayout: false,
        isReset: false,
        accountNumber: trade.accountNumber
      })
    })
    
    // Add payouts and resets
    limitedAccountNumbers.forEach(accountNumber => {
      const account = accountMap.get(accountNumber)
      if (!account) return
      
             // Add payouts
       account.payouts?.forEach((payout: PrismaPayout) => {
         allEvents.push({
           date: new Date(payout.date),
           amount: ['PENDING', 'VALIDATED', 'PAID'].includes(payout.status) ? -payout.amount : 0,
           isPayout: true,
           isReset: false,
           payoutStatus: payout.status,
           accountNumber: accountNumber
         })
       })
      
      // Add reset if exists
      if (account.resetDate) {
        allEvents.push({
          date: new Date(account.resetDate),
          amount: 0, // Reset doesn't change balance directly
          isPayout: false,
          isReset: true,
          accountNumber: accountNumber
        })
      }
    })
    
    // Sort events by date
    allEvents.sort((a, b) => a.date.getTime() - b.date.getTime())

    // Use arrays instead of Maps for better performance with small datasets
    const accountEquities: Record<string, number> = {}
    const accountStartingBalances: Record<string, number> = {}
    const accountFirstActivity: Record<string, string | null> = {}
    
    limitedAccountNumbers.forEach(acc => {
      const account = accountMap.get(acc)
      accountEquities[acc] = 0
      accountStartingBalances[acc] = account?.startingBalance || 0
      accountFirstActivity[acc] = null
    })

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
          point[`equity_${acc}`] = undefined
          point[`payout_${acc}`] = false
          point[`reset_${acc}`] = false
          point[`payoutStatus_${acc}`] = ''
          point[`payoutAmount_${acc}`] = 0
        })
      }

      // Process events for this date
      const dateEvents = allEvents.filter(event => 
        formatInTimeZone(event.date, timezone, 'yyyy-MM-dd') === dateKey
      )

      // Process each account
      for (const accountNumber of limitedAccountNumbers) {
        if (!selectedAccounts.has(accountNumber)) continue

        const account = accountMap.get(accountNumber)
        const accountEvents = dateEvents.filter(event => event.accountNumber === accountNumber)
        
                         // Process account events
        accountEvents.forEach(event => {
          if (event.isReset) {
            // Reset the balance to 0
            accountEquities[accountNumber] = 0
            point[`reset_${accountNumber}`] = true
            // Mark first activity if not already set
            if (!accountFirstActivity[accountNumber]) {
              accountFirstActivity[accountNumber] = dateKey
            }
          } else {
            // Add the event amount to equity
            accountEquities[accountNumber] += event.amount
            
            // Mark first activity if not already set
            if (!accountFirstActivity[accountNumber]) {
              accountFirstActivity[accountNumber] = dateKey
            }
            
            if (event.isPayout) {
              point[`payout_${accountNumber}`] = true
              point[`payoutStatus_${accountNumber}`] = event.payoutStatus || ''
              point[`payoutAmount_${accountNumber}`] = -event.amount
            }
          }
        })

        // Note: Trades are already processed in the events above, so we don't need to process them again here

        if (showIndividual) {
          // Only show equity if account has had activity
          if (accountFirstActivity[accountNumber] && accountFirstActivity[accountNumber] <= dateKey) {
            point[`equity_${accountNumber}`] = accountEquities[accountNumber]
          } else {
            // Set to undefined to not show the line
            point[`equity_${accountNumber}`] = undefined
          }
        }
        totalEquity += accountEquities[accountNumber]
      }

      if (!showIndividual) {
        point.equity = totalEquity
      }

      chartData.push(point)
    })

    return chartData
  }, [trades, accounts, accountNumbers, selectedAccounts, allDates, timezone, showIndividual, maxAccounts, dataSampling])
}

// Custom dot renderer for payouts and resets
const renderDot = (props: any) => {
  const { cx, cy, payload, index, dataKey } = props
  if (typeof cx !== 'number' || typeof cy !== 'number') {
    return <circle key={`dot-${index}-empty`} cx={cx} cy={cy} r={0} fill="none" />
  }
  
  // Extract account number from dataKey (e.g., "equity_12345" -> "12345")
  const accountNumber = dataKey?.replace('equity_', '')
  
  // For grouped view (dataKey is "equity"), check all accounts
  if (dataKey === 'equity') {
    // Check for reset indicators
    const resetAccounts = Object.keys(payload).filter(key => key.startsWith('reset_') && payload[key])
    if (resetAccounts.length > 0) {
      return (
        <circle
          key={`dot-${index}-reset`}
          cx={cx}
          cy={cy}
          r={5}
          fill="#ff6b6b"
          stroke="white"
          strokeWidth={2}
        />
      )
    }
    
    // Check for payout indicators
    const payoutAccounts = Object.keys(payload).filter(key => key.startsWith('payout_') && payload[key])
    if (payoutAccounts.length > 0) {
      const accountNumber = payoutAccounts[0].replace('payout_', '')
      const status = payload[`payoutStatus_${accountNumber}`] || ''
      return (
        <circle
          key={`dot-${index}-payout`}
          cx={cx}
          cy={cy}
          r={4}
          fill={getPayoutColor(status)}
          stroke="white"
          strokeWidth={1}
        />
      )
    }
  } else if (accountNumber) {
    // For individual account view, only check this specific account
    const hasReset = payload[`reset_${accountNumber}`]
    const hasPayout = payload[`payout_${accountNumber}`]
    
    if (hasReset) {
      return (
        <circle
          key={`dot-${index}-reset-${accountNumber}`}
          cx={cx}
          cy={cy}
          r={5}
          fill="#ff6b6b"
          stroke="white"
          strokeWidth={2}
        />
      )
    }
    
    if (hasPayout) {
      const status = payload[`payoutStatus_${accountNumber}`] || ''
      return (
        <circle
          key={`dot-${index}-payout-${accountNumber}`}
          cx={cx}
          cy={cy}
          r={4}
          fill={getPayoutColor(status)}
          stroke="white"
          strokeWidth={1}
        />
      )
    }
  }
  
  return <circle key={`dot-${index}-empty`} cx={cx} cy={cy} r={0} fill="none" />
}

// Enhanced tooltip component for grouped mode
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

  // Find accounts with resets and payouts for this date
  const resetAccounts: string[] = []
  const payoutAccounts: Array<{account: string, amount: number, status: string}> = []

  Object.keys(data).forEach(key => {
    if (key.startsWith('reset_') && data[key as keyof ChartDataPoint]) {
      const accountNumber = key.replace('reset_', '')
      resetAccounts.push(accountNumber)
    }
    if (key.startsWith('payout_') && data[key as keyof ChartDataPoint]) {
      const accountNumber = key.replace('payout_', '')
      const amount = data[`payoutAmount_${accountNumber}` as keyof ChartDataPoint] as number || 0
      const status = data[`payoutStatus_${accountNumber}` as keyof ChartDataPoint] as string || ''
      payoutAccounts.push({ account: accountNumber, amount, status })
    }
  })

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
        
        {/* Show reset information */}
        {resetAccounts.length > 0 && (
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('equity.tooltip.resets')}
            </span>
            <div className="space-y-1">
              {resetAccounts.map(account => (
                <div key={account} className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: accountColorMap.get(account) || ACCOUNT_COLORS[0] }}
                  />
                  <span className="text-sm text-foreground">
                    {t('equity.tooltip.accountReset', { account })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Show payout information */}
        {payoutAccounts.length > 0 && (
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('equity.tooltip.payouts')}
            </span>
            <div className="space-y-1">
              {payoutAccounts.map(({ account, amount, status }) => (
                <div key={account} className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: accountColorMap.get(account) || ACCOUNT_COLORS[0] }}
                  />
                  <span className="text-sm text-foreground">
                    {account}: {formatCurrency(amount)}
                  </span>
                  <span 
                    className="text-xs px-1 py-0.5 rounded"
                    style={{ 
                      backgroundColor: getPayoutColor(status) + '20',
                      color: getPayoutColor(status)
                    }}
                  >
                    {status.toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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
      color: accountColorMap.get(acc) || ACCOUNT_COLORS[0],
      hasPayout: displayData?.[`payout_${acc}` as keyof ChartDataPoint] as boolean || false,
      hasReset: displayData?.[`reset_${acc}` as keyof ChartDataPoint] as boolean || false,
      payoutStatus: displayData?.[`payoutStatus_${acc}` as keyof ChartDataPoint] as string || '',
      payoutAmount: displayData?.[`payoutAmount_${acc}` as keyof ChartDataPoint] as number || 0
    }))
    .sort((a, b) => b.latestEquity - a.latestEquity)

  return (
    <div className="border-t pt-2 mt-2 h-[88px] flex flex-col">
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
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
      <div className="flex gap-3 overflow-x-auto max-w-full flex-1 scrollbar-hide">
        <div className="flex gap-3 min-w-max">
          {accountsWithEquity.slice(0, 20).map(({ accountNumber, equity, color, hasPayout, hasReset, payoutStatus, payoutAmount }) => (
            <div key={accountNumber} className="flex items-center gap-1.5 flex-shrink-0">
              <div 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                style={{ backgroundColor: color }}
              />
              <div className="flex flex-col h-[50px] justify-start">
                <span className="text-xs font-medium text-foreground leading-tight">
                  {accountNumber}
                </span>
                <span className="text-xs text-muted-foreground leading-tight">
                  {formatCurrency(equity)}
                </span>
                <div className="min-h-[14px] flex flex-col">
                  {hasPayout && (
                    <span className="text-xs leading-tight" style={{ color: getPayoutColor(payoutStatus) }}>
                      {t('equity.legend.payout')}: {formatCurrency(payoutAmount)}
                    </span>
                  )}
                  {hasReset && (
                    <span className="text-xs text-red-500 leading-tight">
                      {t('equity.legend.reset')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {accountsWithEquity.length > 20 && (
            <div className="flex items-center gap-1.5 flex-shrink-0 text-xs text-muted-foreground h-[50px]">
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
  const accounts = useUserStore(state => state.accounts)
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
    accounts,
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
          dot={renderDot}
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
          dot={renderDot}
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
                  <ReferenceLine
                    y={0}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
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