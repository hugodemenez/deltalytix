'use client'

import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { ReactElement } from "react"

interface Trade {
  accountNumber: string
  entryDate: string | Date
  pnl: number
  commission?: number
}

interface Payout {
  id: string
  amount: number
  date: Date
  status: string
}

// Add interface for event type
interface ChartEvent {
  date: Date
  amount: number
  isPayout: boolean
  payoutStatus?: string
}

interface ChartDataPoint {
  tradeIndex: number
  date: string
  balance: number
  drawdownLevel: number
  highestBalance: number
  target: number
  pnl: number
  isPayout?: boolean
  payoutStatus?: string
  payoutAmount: number
}

interface TradeProgressChartProps {
  trades: Trade[]
  startingBalance: number
  drawdownThreshold: number
  profitTarget: number
  trailingDrawdown?: boolean
  trailingStopProfit?: number
  payouts?: Payout[]
  className?: string
}

export function TradeProgressChart({
  trades,
  startingBalance,
  drawdownThreshold,
  profitTarget,
  trailingDrawdown = false,
  trailingStopProfit = 0,
  payouts = [],
  className
}: TradeProgressChartProps) {
  const t = useI18n()

  const chartConfig = {
    balance: {
      label: t('propFirm.chart.balance'),
      color: "#2563eb",
    },
    drawdown: {
      label: t('propFirm.chart.drawdownLevel'),
      color: "#dc2626",
    },
    target: {
      label: t('propFirm.chart.profitTarget'),
      color: "#16a34a",
    },
    payout: {
      label: t('propFirm.chart.payout'),
      color: "#9333ea",
    }
  }

  // Create combined events array with both trades and payouts
  const allEvents: ChartEvent[] = [
    ...trades.map(trade => ({
      date: new Date(trade.entryDate),
      amount: trade.pnl - (trade.commission || 0),
      isPayout: false
    })),
    ...payouts.map(payout => ({
      date: new Date(payout.date),
      amount: ['PENDING', 'VALIDATED', 'PAID'].includes(payout.status) ? -payout.amount : 0,
      isPayout: true,
      payoutStatus: payout.status
    }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime())

  // Process events to create chart data
  const chartData = allEvents.reduce((acc, event, index) => {
    const prevBalance = index > 0 ? acc[index - 1].balance : startingBalance
    const balance = prevBalance + event.amount
    
    // Calculate highest balance up to this point
    const previousHighest = index > 0 ? acc[index - 1].highestBalance : startingBalance
    const highestBalance = event.isPayout ? previousHighest : Math.max(previousHighest, balance)
    
    // Calculate drawdown level based on trailing or fixed drawdown
    let drawdownLevel
    if (trailingDrawdown) {
      const profitMade = Math.max(0, highestBalance - startingBalance)
      
      // If we've hit trailing stop profit, lock the drawdown to that level
      if (profitMade >= trailingStopProfit) {
        drawdownLevel = (startingBalance + trailingStopProfit) - drawdownThreshold
      } else {
        // Otherwise, drawdown level trails the highest balance
        drawdownLevel = highestBalance - drawdownThreshold
      }
    } else {
      // Fixed drawdown - always relative to starting balance
      drawdownLevel = startingBalance - drawdownThreshold
    }

    return [...acc, {
      tradeIndex: index + 1,
      date: event.date.toLocaleDateString(),
      balance,
      drawdownLevel,
      highestBalance,
      target: startingBalance + profitTarget,
      pnl: event.isPayout ? 0 : event.amount,
      isPayout: event.isPayout,
      payoutStatus: event.payoutStatus,
      payoutAmount: event.isPayout ? -event.amount : 0
    }]
  }, [] as ChartDataPoint[])

  const getPayoutColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#9CA3AF'
      case 'VALIDATED': return '#F97316'
      case 'REFUSED': return '#DC2626'
      case 'PAID': return '#16A34A'
      default: return '#9CA3AF'
    }
  }

  const renderDot = (props: any) => {
    const { cx, cy, payload, index } = props
    if (!payload?.isPayout || typeof cx !== 'number' || typeof cy !== 'number') {
      return <circle key={`dot-${index}-empty`} cx={cx} cy={cy} r={0} fill="none" />
    }
    return (
      <circle
        key={`dot-${index}-payout`}
        cx={cx}
        cy={cy}
        r={4}
        fill={getPayoutColor(payload.payoutStatus || '')}
        stroke="white"
        strokeWidth={1}
      />
    )
  }

  return (
    <div className="w-full space-y-2">
      <ChartContainer
        config={chartConfig}
        className={cn("h-[200px] w-full", className)}
      >
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="tradeIndex"
                tickLine={false}
                axisLine={true}
                tickMargin={8}
                tick={false}
              />
              <YAxis
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                domain={[
                  (dataMin: number) => Math.floor(Math.min(dataMin, startingBalance - drawdownThreshold) / 1000) * 1000,
                  (dataMax: number) => Math.ceil(Math.max(dataMax, startingBalance + profitTarget) / 1000) * 1000
                ]}
                axisLine={true}
              />
              <Tooltip
                cursor={{ stroke: '#666', strokeWidth: 1, strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ChartDataPoint;
                    return (
                      <div className="bg-background/80 backdrop-blur-lg p-2 border rounded shadow-sm text-xs space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{data.tradeIndex}</span>
                          <span className="text-muted-foreground">{data.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">${data.balance.toLocaleString()}</span>
                          {!data.isPayout && (
                            <span className={cn(
                              "text-sm",
                              data.pnl >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {data.pnl >= 0 ? '+' : ''}{data.pnl.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">DD: ${data.drawdownLevel.toLocaleString()}</span>
                          <span className="text-blue-600">High: ${data.highestBalance.toLocaleString()}</span>
                        </div>
                        {data.isPayout && data.payoutStatus && (
                          <div className={cn(
                            "flex items-center gap-2",
                            {
                              "text-gray-500": data.payoutStatus === 'PENDING',
                              "text-orange-500": data.payoutStatus === 'VALIDATED',
                              "text-red-500": data.payoutStatus === 'REFUSED',
                              "text-green-500": data.payoutStatus === 'PAID',
                            }
                          )}>
                            <span>${data.payoutAmount.toLocaleString()}</span>
                            <span className="text-xs">({data.payoutStatus.toLowerCase()})</span>
                          </div>
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
                name={t('propFirm.chart.balance')}
                stroke={chartConfig.balance.color}
                strokeWidth={2}
                dot={renderDot}
              />
              <Line
                type="monotone"
                dataKey="drawdownLevel"
                name={t('propFirm.chart.drawdownLevel')}
                stroke={chartConfig.drawdown.color}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="target"
                name={t('propFirm.chart.profitTarget')}
                stroke={chartConfig.target.color}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              <ReferenceLine
                y={startingBalance}
                stroke="#666"
                strokeDasharray="3 3"
                label={{
                  value: t('propFirm.chart.startingBalance'),
                  position: "right",
                  fill: "#666",
                  fontSize: 12,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">{t('propFirm.chart.noTrades')}</p>
          </div>
        )}
      </ChartContainer>
    </div>
  )
} 