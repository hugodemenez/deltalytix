'use client'

import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"

interface Trade {
  accountNumber: string
  entryDate: string | Date
  pnl: number
  commission?: number
}

interface TradeProgressChartProps {
  trades: Trade[]
  startingBalance: number
  drawdownThreshold: number
  profitTarget: number
  trailingDrawdown?: boolean
  trailingStopProfit?: number
  className?: string
}

export function TradeProgressChart({
  trades,
  startingBalance,
  drawdownThreshold,
  profitTarget,
  trailingDrawdown = false,
  trailingStopProfit = 0,
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
  }

  // Sort trades by date first
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  )

  // Process trades to create chart data
  const chartData = sortedTrades.reduce((acc, trade, index) => {
    const prevBalance = index > 0 ? acc[index - 1].balance : startingBalance
    const tradePnL = trade.pnl - (trade.commission || 0)
    const balance = prevBalance + tradePnL
    
    // Calculate highest balance up to this point
    const previousHighest = index > 0 ? acc[index - 1].highestBalance : startingBalance
    const highestBalance = Math.max(previousHighest, balance)
    
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
      date: new Date(trade.entryDate).toLocaleDateString(),
      balance,
      drawdownLevel,
      highestBalance,
      target: startingBalance + profitTarget,
      pnl: tradePnL
    }]
  }, [] as Array<{
    tradeIndex: number
    date: string
    balance: number
    drawdownLevel: number
    highestBalance: number
    target: number
    pnl: number
  }>)

  return (
    <div className="w-full space-y-2">
      <ChartContainer
        config={chartConfig}
        className={cn("h-[300px] w-full", className)}
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
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background p-2 border rounded shadow-sm">
                        <p className="text-sm font-medium">
                          {t('propFirm.chart.tradeNumber', { number: data.tradeIndex })}
                        </p>
                        <p className="text-xs text-muted-foreground">{data.date}</p>
                        <p className="text-sm">
                          {t('propFirm.chart.balanceAmount', { amount: data.balance.toLocaleString() })}
                        </p>
                        <p className="text-sm">
                          {t('propFirm.chart.pnlAmount', { amount: data.pnl.toLocaleString() })}
                        </p>
                        <p className="text-sm text-red-600">
                          {t('propFirm.chart.drawdownAmount', { amount: data.drawdownLevel.toLocaleString() })}
                        </p>
                        <p className="text-sm text-blue-600">
                          {t('propFirm.chart.highestBalance', { amount: data.highestBalance.toLocaleString() })}
                        </p>
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
                dot={false}
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