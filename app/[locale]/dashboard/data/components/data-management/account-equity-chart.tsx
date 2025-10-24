'use client'

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, TooltipProps, ReferenceLine } from "recharts"
import { format, isValid, startOfDay } from 'date-fns'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

const chartConfig = {
  balance: {
    label: "Balance",
    color: "#2563eb",
  },
  target: {
    label: "Profit Target",
    color: "#16a34a",
  },
  drawdown: {
    label: "Drawdown Level",
    color: "#dc2626",
  },
} satisfies ChartConfig

const safeParseDate = (dateString: string): Date | null => {
  const date = new Date(dateString)
  return isValid(date) ? startOfDay(date) : null
}

interface ChartDataPoint {
  date: string
  balance: number
  target: number
  drawdownLevel: number
  balanceFormatted: string
  isPayout?: boolean
  payoutStatus?: string
  isAfterReset?: boolean
}

interface AccountEquityChartProps {
  trades: any[]
  drawdownThreshold: number
  profitTarget: number
  startingBalance: number
  payouts: Array<{
    id: string
    amount: number
    date: Date
    status: string
  }>
  trailingDrawdown?: boolean
  trailingStopProfit?: number
  resetDate?: string
}

// Add interface for event type
interface ChartEvent {
  date: Date
  amount: number
  isPayout: boolean
  payoutStatus?: string
}

interface CustomDotProps {
  cx?: number
  cy?: number
  r?: number
  stroke?: string
  strokeWidth?: number
  fill?: string
  value?: number
  payload?: {
    isPayout?: boolean
    payoutStatus?: string
    date: string
    balance: number
    drawdownLevel: number
    isAfterReset?: boolean
  }
  index?: number
}

export function AccountEquityChart({
  trades,
  drawdownThreshold,
  profitTarget,
  startingBalance,
  payouts,
  trailingDrawdown = false,
  trailingStopProfit = 0,
  resetDate
}: AccountEquityChartProps) {
  const chartData = React.useMemo(() => {
    if (!trades.length) return []

    const sortedTrades = [...trades].sort((a, b) =>
      new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    )

    const payoutPoints: ChartEvent[] = payouts.map(payout => ({
      date: new Date(payout.date),
      amount: ['PENDING', 'VALIDATED', 'PAID'].includes(payout.status) ? -payout.amount : 0,
      isPayout: true,
      payoutStatus: payout.status
    }))

    const allEvents: ChartEvent[] = [
      ...sortedTrades.map(trade => ({
        date: new Date(trade.entryDate),
        amount: trade.pnl - (trade.commission || 0),
        isPayout: false
      })),
      ...payoutPoints
    ].sort((a, b) => a.date.getTime() - b.date.getTime())

    if (allEvents.length === 0) return []

    const firstDate = allEvents[0].date
    const lastDate = allEvents[allEvents.length - 1].date
    const dailyPoints: ChartDataPoint[] = []
    const resetDateObj = resetDate ? new Date(resetDate) : null

    // Function to calculate daily points with initial values
    const calculatePoints = (
      startDate: Date,
      endDate: Date,
      initialBalance: number,
      events: typeof allEvents,
      isAfterReset: boolean = false
    ) => {
      const currentDate = new Date(startDate)
      let runningBalance = initialBalance
      let maxBalanceToDate = initialBalance
      let maxDrawdownLevel = initialBalance - drawdownThreshold
      let hasReachedStopProfit = false
      const stopProfitBalance = initialBalance + trailingStopProfit

      while (currentDate <= endDate) {
        const dayEvents = events.filter(event =>
          event.date.toDateString() === currentDate.toDateString()
        )

        // Find payout event for this day if any
        const payoutEvent = dayEvents.find(event => event.isPayout)

        const dayTotal = dayEvents.reduce((sum, event) => sum + event.amount, 0)
        runningBalance += dayTotal

        // Calculate current profit relative to initial balance
        const currentProfit = runningBalance - initialBalance

        if (trailingDrawdown) {
          if (trailingStopProfit > 0 && currentProfit >= trailingStopProfit) {
            // If we've reached stop profit, lock the drawdown level
            if (!hasReachedStopProfit) {
              hasReachedStopProfit = true
              maxDrawdownLevel = initialBalance + trailingStopProfit - drawdownThreshold
            }
          } else if (!hasReachedStopProfit) {
            // Only update drawdown level if we haven't reached stop profit
            if (runningBalance > maxBalanceToDate) {
              maxBalanceToDate = runningBalance
              maxDrawdownLevel = maxBalanceToDate - drawdownThreshold
            }
          }
        }

        dailyPoints.push({
          date: format(currentDate, "yyyy-MM-dd"),
          balance: runningBalance,
          target: initialBalance + profitTarget,
          drawdownLevel: maxDrawdownLevel,
          balanceFormatted: `$${runningBalance.toLocaleString()}`,
          isPayout: !!payoutEvent,
          payoutStatus: (payoutEvent as ChartEvent | undefined)?.payoutStatus,
          isAfterReset
        })

        currentDate.setDate(currentDate.getDate() + 1)
      }

      return runningBalance
    }

    if (resetDateObj) {
      const preResetEvents = allEvents.filter(event => event.date < resetDateObj)
      calculatePoints(firstDate, resetDateObj, startingBalance, preResetEvents)

      const postResetEvents = allEvents.filter(event => event.date >= resetDateObj)
      if (postResetEvents.length > 0) {
        calculatePoints(
          resetDateObj,
          lastDate,
          startingBalance,
          postResetEvents,
          true
        )
      }
    } else {
      calculatePoints(firstDate, lastDate, startingBalance, allEvents)
    }

    return dailyPoints
  }, [trades, payouts, startingBalance, drawdownThreshold, trailingDrawdown, trailingStopProfit, profitTarget, resetDate])

  // Update the renderDot function
  const renderDot = React.useCallback((props: CustomDotProps) => {
    const { payload, cx, cy } = props

    if (!payload?.isPayout || !payload?.payoutStatus || typeof cx !== 'number' || typeof cy !== 'number') {
      return <circle cx={0} cy={0} r={0} fill="none" />
    }

    const getPayoutColor = (status: string) => {
      switch (status) {
        case 'PENDING': return '#9CA3AF'
        case 'VALIDATED': return '#F97316'
        case 'REFUSED': return '#DC2626'
        case 'PAID': return '#16A34A'
        default: return '#9CA3AF'
      }
    }

    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={getPayoutColor(payload.payoutStatus)}
        stroke="white"
        strokeWidth={1}
      />
    )
  }, [])

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[250px] w-full"
    >
      {chartData.length > 0 ? (
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tickFormatter={(value) => {
              const date = safeParseDate(value)
              return date ? format(date, 'MMM dd') : ''
            }}
          />
          <YAxis
            tickFormatter={(value) => `$${value.toLocaleString()}`}
            domain={[
              (dataMin: number) => Math.floor(Math.min(dataMin, startingBalance - drawdownThreshold) / 1000) * 1000,
              (dataMax: number) => Math.ceil(Math.max(dataMax, startingBalance + profitTarget) / 1000) * 1000
            ]}
          />
          <ChartTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-background p-2 border rounded shadow-xs">
                    <p className="text-sm font-medium">
                      {format(safeParseDate(data.date) || new Date(), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-sm">Balance: ${data.balance.toLocaleString()}</p>
                    <p className="text-sm text-red-600">
                      Drawdown Level: ${data.drawdownLevel.toLocaleString()}
                    </p>
                    {data.isPayout && data.payoutStatus && (
                      <p className={cn(
                        "text-sm font-medium",
                        {
                          "text-gray-500": data.payoutStatus === 'PENDING',
                          "text-orange-500": data.payoutStatus === 'VALIDATED',
                          "text-red-500": data.payoutStatus === 'REFUSED',
                          "text-green-500": data.payoutStatus === 'PAID',
                        }
                      )}>
                        Payout ({data.payoutStatus.toLowerCase()})
                      </p>
                    )}
                    {data.isAfterReset && (
                      <p className="text-sm font-medium text-purple-500">After Reset Date</p>
                    )}
                  </div>
                )
              }
              return null
            }}
          />
          <Line
            type="monotone"
            dataKey="balance"
            name="Balance"
            stroke={chartConfig.balance.color}
            strokeWidth={2}
            activeDot={false}
            dot={renderDot}
          />
          <Line
            type="monotone"
            dataKey="target"
            name="Profit Target"
            stroke={chartConfig.target.color}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="drawdownLevel"
            name="Drawdown Level"
            stroke={chartConfig.drawdown.color}
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={false}
            connectNulls
          />
          {resetDate && (
            <ReferenceLine
              x={resetDate}
              stroke="#FF8C00"
              strokeDasharray="3 3"
              label={{
                value: "Reset Date",
                position: "insideTopLeft",
                fill: "#FF8C00",
                fontSize: 12,
              }}
            />
          )}
        </LineChart>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">No data available</p>
        </div>
      )}
    </ChartContainer>
  )
} 