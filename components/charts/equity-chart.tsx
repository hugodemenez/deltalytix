"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { format, isValid } from 'date-fns'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useTrades } from "../context/trades-data"

const chartConfig = {
  equity: {
    label: "Equity",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig


const safeParseDate = (dateString: string): Date | null => {
  const date = new Date(dateString)
  return isValid(date) ? date : null
}

export default function EnhancedEquityChart() {
  const { trades } = useTrades()
  const [showDailyPnL, setShowDailyPnL] = React.useState(true)

  const chartData = React.useMemo(() => {
    const validTrades = trades.filter(trade => {
      const buyDate = safeParseDate(trade.buyDate)
      return buyDate !== null
    })

    if (showDailyPnL) {
      // Calculate daily PnL
      const dailyPnL = validTrades.reduce((acc, trade) => {
        const date = trade.sellDate || trade.buyDate
        const pnl = parseFloat(trade.pnl) || 0
        if (!acc[date]) {
          acc[date] = 0
        }
        acc[date] += pnl
        return acc
      }, {} as Record<string, number>)

      let cumulativePnL = 0
      return Object.entries(dailyPnL)
        .sort(([dateA], [dateB]) => {
          const a = safeParseDate(dateA)
          const b = safeParseDate(dateB)
          return a && b ? a.getTime() - b.getTime() : 0
        })
        .map(([date, pnl]) => {
          cumulativePnL += pnl
          return {
            date,
            equity: cumulativePnL,
            equityFormatted: `$${cumulativePnL.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
          }
        })
    } else {
      // Calculate per-trade PnL
      let cumulativePnL = 0
      return validTrades
        .sort((a, b) => {
          const dateA = safeParseDate(a.buyDate)
          const dateB = safeParseDate(b.buyDate)
          return dateA && dateB ? dateA.getTime() - dateB.getTime() : 0
        })
        .map((trade) => {
          cumulativePnL += parseFloat(trade.pnl) || 0
          return {
            date: trade.sellDate || trade.buyDate,
            equity: cumulativePnL,
            equityFormatted: `$${cumulativePnL.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
          }
        })
    }
  }, [trades, showDailyPnL])

  const finalEquity = chartData.length > 0 ? chartData[chartData.length - 1].equity : 0

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>Equity Curve</CardTitle>
          <CardDescription>
            Showing cumulative profit and loss over time
          </CardDescription>
        </div>
        <div className="flex">
          {["daily", "per-trade"].map((key) => {
            const chart = key as keyof typeof chartConfig
            return (
              <button
                key={chart}
                data-active={showDailyPnL === (key==="daily")}
                className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
                onClick={() => setShowDailyPnL(key==="daily")}
              >
                <span className="text-xs text-muted-foreground">
                  {key==="daily" ? "Daily PnL" : "Per-trade PnL"}
                </span>
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
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
                  domain={[finalEquity, 'auto']}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[150px]"
                      labelFormatter={(value) => {
                        const date = safeParseDate(value)
                        return date ? format(date, 'MMM dd, yyyy') : ''
                      }}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="equity"
                  name="Equity"
                  stroke={`var(--color-equity)`}
                  dot={false}
                />
              </LineChart>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">No data available</p>
            </div>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}