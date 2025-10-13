"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, TooltipProps, ReferenceLine } from "recharts"
import { format, parseISO, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { fr, enUS } from 'date-fns/locale'
import { ChevronDown, ChevronUp } from "lucide-react"
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
import { Info } from "lucide-react"

import { useData } from "@/context/data-provider"
import { useI18n } from "@/locales/client"
import { useCurrentLocale } from "@/locales/client"
import { useUserStore } from "@/store/user-store"
import { useEquityChartStore } from "@/store/equity-chart-store"
import { Payout as PrismaPayout } from '@prisma/client'
import { AccountSelectionPopover } from "./account-selection-popover"
import { getEquityChartDataAction } from "@/server/equity-chart"

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

// Optimized constants
const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Map account numbers to theme-aware chart colors defined in globals.css
function getChartColorByIndex(index: number): string {
  const paletteVars = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--chart-6))',
    'hsl(var(--chart-7))',
    'hsl(var(--chart-8))',
  ]
  return paletteVars[index % paletteVars.length]
}

// Generate consistent theme-aware color based on accountNumber string
function generateAccountColor(accountNumber: string): string {
  let hash = 0
  for (let i = 0; i < accountNumber.length; i++) {
    const char = accountNumber.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  const index = Math.abs(hash) % 8
  return getChartColorByIndex(index)
}

// Color map function using theme-aware chart palette
function createAccountColorMap(accountNumbers: string[]): Map<string, string> {
  return new Map(accountNumbers.map(accountNumber => [
    accountNumber,
    generateAccountColor(accountNumber)
  ]))
}

// Get payout colors (foreground and subtle background) based on status using theme tokens
const getPayoutColors = (status: string) => {
  switch (status) {
    case 'PENDING':
      return { fg: 'hsl(var(--muted-foreground))', bg: 'hsl(var(--muted-foreground) / 0.15)' }
    case 'VALIDATED':
      return { fg: 'hsl(var(--chart-4))', bg: 'hsl(var(--chart-4) / 0.15)' }
    case 'REFUSED':
      return { fg: 'hsl(var(--destructive))', bg: 'hsl(var(--destructive) / 0.15)' }
    case 'PAID':
      return { fg: 'hsl(var(--success))', bg: 'hsl(var(--success) / 0.15)' }
    default:
      return { fg: 'hsl(var(--muted-foreground))', bg: 'hsl(var(--muted-foreground) / 0.15)' }
  }
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
      const { fg } = getPayoutColors(status)
      return (
        <circle
          key={`dot-${index}-payout`}
          cx={cx}
          cy={cy}
          r={4}
          fill={fg}
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
          fill="hsl(var(--destructive))"
          stroke="white"
          strokeWidth={2}
        />
      )
    }
    
    if (hasPayout) {
      const status = payload[`payoutStatus_${accountNumber}`] || ''
      const { fg } = getPayoutColors(status)
      return (
        <circle
          key={`dot-${index}-payout-${accountNumber}`}
          cx={cx}
          cy={cy}
          r={4}
          fill={fg}
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
  onHover,
  dateLocale
}: {
  active?: boolean
  payload?: any[]
  data?: ChartDataPoint
  showIndividual: boolean
  size: WidgetSize
  accountColorMap: Map<string, string>
  t: any
  onHover?: (data: ChartDataPoint | null) => void
  dateLocale: any
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
    <div className="rounded-lg border bg-background p-2 shadow-xs">
      <div className="grid gap-2">
        <div className="flex flex-col">
          <span className="text-[0.70rem] uppercase text-muted-foreground">
            {t('equity.tooltip.date')}
          </span>
          <span className="font-bold text-muted-foreground">
            {format(new Date(data.date), "MMM d, yyyy", { locale: dateLocale })}
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
                    style={{ backgroundColor: accountColorMap.get(account) || generateAccountColor(account) }}
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
                    style={{ backgroundColor: accountColorMap.get(account) || generateAccountColor(account) }}
                  />
                  <span className="text-sm text-foreground">
                    {account}: {formatCurrency(amount)}
                  </span>
                  <span 
                    className="text-xs px-1 py-0.5 rounded"
                    style={{ 
                      backgroundColor: getPayoutColors(status).bg,
                      color: getPayoutColors(status).fg
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
  onToggleAccount,
  t,
  dateLocale
}: {
  accountNumbers: string[]
  accountColorMap: Map<string, string>
  selectedAccounts: Set<string>
  chartData: ChartDataPoint[]
  hoveredData: ChartDataPoint | null
  onToggleAccount: (accountNumber: string) => void
  t: any
  dateLocale: any
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
      color: accountColorMap.get(acc) || generateAccountColor(acc),
      hasPayout: displayData?.[`payout_${acc}` as keyof ChartDataPoint] as boolean || false,
      hasReset: displayData?.[`reset_${acc}` as keyof ChartDataPoint] as boolean || false,
      payoutStatus: displayData?.[`payoutStatus_${acc}` as keyof ChartDataPoint] as string || '',
      payoutAmount: displayData?.[`payoutAmount_${acc}` as keyof ChartDataPoint] as number || 0
    }))
    .sort((a, b) => b.latestEquity - a.latestEquity)

  return (
    <div className="border-t pt-2 mt-2 h-[88px] flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {t('equity.legend.title')}
            {isHovered && displayData && (
              <span className="ml-2 text-xs text-primary">
                - {format(new Date(displayData.date), "MMM d, yyyy", { locale: dateLocale })}
              </span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            ({accountsWithEquity.length} {t('equity.legend.accounts')})
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="z-9999 max-w-xs">
                <p className="text-xs">{t('equity.legend.maxAccountsInfo')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <AccountSelectionPopover
          accountNumbers={accountNumbers}
          selectedAccounts={Array.from(selectedAccounts)}
          onToggleAccount={onToggleAccount}
          t={t}
        />
      </div>
      <div className="flex gap-3 overflow-x-auto max-w-full flex-1 scrollbar-hide">
        <div className="flex gap-3 min-w-max">
          {accountsWithEquity.slice(0, 20).map(({ accountNumber, equity, color, hasPayout, hasReset, payoutStatus, payoutAmount }) => (
            <div key={accountNumber} className="flex items-center gap-1.5 shrink-0">
              <div 
                className="w-2.5 h-2.5 rounded-full shrink-0" 
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
                    <span className="text-xs leading-tight" style={{ color: getPayoutColors(payoutStatus).fg }}>
                      {t('equity.legend.payout')}: {formatCurrency(payoutAmount)}
                    </span>
                  )}
                  {hasReset && (
                    <span className="text-xs leading-tight" style={{ color: 'hsl(var(--destructive))' }}>
                      {t('equity.legend.reset')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {accountsWithEquity.length > 20 && (
            <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground h-[50px]">
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
  const { 
    instruments,
    accountNumbers,
    dateRange,
    pnlRange,
    tickRange,
    timeRange,
    tickFilter,
    weekdayFilter,
    hourFilter,
    tagFilter
  } = useData()
  const accounts = useUserStore(state => state.accounts)
  const timezone = useUserStore(state => state.timezone)
  const { 
    config, 
    setShowIndividual, 
    setSelectedAccountsToDisplay,
    toggleAccountSelection
  } = useEquityChartStore()
  const showIndividual = config.showIndividual
  const [hoveredData, setHoveredData] = React.useState<ChartDataPoint | null>(null)
  const [chartData, setChartData] = React.useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [availableAccountNumbers, setAvailableAccountNumbers] = React.useState<string[]>([])
  
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
  const locale = useCurrentLocale()
  const dateLocale = locale === 'fr' ? fr : enUS

  // Account selection handlers
  const handleToggleAccount = React.useCallback((accountNumber: string) => {
    toggleAccountSelection(accountNumber)
  }, [toggleAccountSelection])

  // Initialize selected accounts if empty
  React.useEffect(() => {
    if ((!config.selectedAccountsToDisplay || config.selectedAccountsToDisplay.length === 0) && availableAccountNumbers.length > 0) {
      setSelectedAccountsToDisplay(availableAccountNumbers)
    }
  }, [config.selectedAccountsToDisplay, availableAccountNumbers, setSelectedAccountsToDisplay])

  const selectedAccounts = React.useMemo(() => 
    new Set(config.selectedAccountsToDisplay || []), 
    [config.selectedAccountsToDisplay]
  )

  const accountColorMap = React.useMemo(() => 
    createAccountColorMap(availableAccountNumbers),
    [availableAccountNumbers]
  )

  // Fetch chart data when filters or config change
  React.useEffect(() => {
    // Don't fetch if we don't have accounts data yet
    if (!accounts || accounts.length === 0) {
      return
    }

    const fetchChartData = async () => {
      setIsLoading(true)
      try {
        const result = await getEquityChartDataAction({
          instruments,
          accountNumbers,
          dateRange: dateRange ? {
            from: dateRange.from.toISOString(),
            to: dateRange.to.toISOString()
          } : undefined,
          pnlRange,
          tickRange,
          timeRange,
          tickFilter,
          weekdayFilter,
          hourFilter,
          tagFilter,
          timezone,
          showIndividual,
          maxAccounts: 8,
          dataSampling: config.dataSampling,
          selectedAccounts: Array.from(selectedAccounts)
        })
        setChartData(result.chartData)
        setAvailableAccountNumbers(result.accountNumbers)
      } catch (error) {
        console.error('Failed to fetch equity chart data:', error)
        setChartData([])
        setAvailableAccountNumbers([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchChartData()
  }, [
    instruments,
    accountNumbers,
    dateRange,
    accounts,
    pnlRange,
    tickRange,
    timeRange,
    tickFilter,
    weekdayFilter,
    hourFilter,
    tagFilter,
    timezone,
    showIndividual,
    config.dataSampling,
    selectedAccounts
  ])

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
    
    const maxAccounts = 8 // Aligned with 8-color palette
    const accountsToShow = Array.from(selectedAccounts).slice(0, maxAccounts)
    return accountsToShow.reduce((acc, accountNumber) => {
      acc[`equity_${accountNumber}`] = {
        label: `Account ${accountNumber}`,
        color: accountColorMap.get(accountNumber) || generateAccountColor(accountNumber),
      }
      return acc
    }, {} as ChartConfig)
  }, [selectedAccounts, showIndividual, accountColorMap])

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

    const maxAccounts = 8 // Aligned with 8-color palette
    const accountsToShow = Array.from(selectedAccounts).slice(0, maxAccounts)
    return accountsToShow.map((accountNumber) => {
      // Use the same color mapping as legend to ensure consistency
      const color = accountColorMap.get(accountNumber) || generateAccountColor(accountNumber)
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
    })
  }, [selectedAccounts, showIndividual, accountColorMap])

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
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-muted-foreground text-sm">
                  {t('equity.loading')}
                </div>
              </div>
            ) : (
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
                      tickFormatter={(value) => format(new Date(value), "MMM d", { locale: dateLocale })}
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
                          dateLocale={dateLocale}
                        />
                      )}
                    />
                    {chartLines}
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </div>
          
          {showIndividual && availableAccountNumbers.length > 1 && size !== 'small' && (
            <AccountsLegend
              accountNumbers={availableAccountNumbers}
              accountColorMap={accountColorMap}
              selectedAccounts={selectedAccounts}
              chartData={chartData}
              hoveredData={hoveredData}
              onToggleAccount={handleToggleAccount}
              t={t}
              dateLocale={dateLocale}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}