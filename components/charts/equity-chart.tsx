"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, TooltipProps } from "recharts"
import { format, isValid, startOfDay } from 'date-fns'

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
} from "@/components/ui/chart"
import { useFormattedTrades, useTrades } from "../context/trades-data"

const chartConfig = {
  equity: {
    label: "Equity",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const safeParseDate = (dateString: string): Date | null => {
  const date = new Date(dateString)
  return isValid(date) ? startOfDay(date) : null
}

interface ChartDataPoint {
  date: string;
  equity: number;
  dailyPnL: number;
  equityFormatted: string;
  dailyPnLFormatted: string;
}

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataPoint;
    return (
      <div className="bg-background p-2 border rounded shadow-sm">
        <p className="text-sm font-medium">{format(safeParseDate(data.date) || new Date(), 'MMM dd, yyyy')}</p>
        <p className="text-sm">Equity: {data.equityFormatted}</p>
        <p className="text-sm">PnL: {data.dailyPnLFormatted}</p>
      </div>
    );
  }

  return null;
};

export default function EnhancedEquityChart() {
  const { formattedTrades:trades } = useFormattedTrades()
  const [showDailyPnL, setShowDailyPnL] = React.useState(true)

  const chartData = React.useMemo(() => {
    const validTrades = trades.filter(trade => {
      const buyDate = safeParseDate(trade.buyDate)
      return buyDate !== null
    })

    if (showDailyPnL) {
      // Calculate daily PnL
      const dailyPnL = validTrades.reduce((acc, trade) => {
        const date = safeParseDate(trade.sellDate || trade.buyDate)
        if (!date) return acc

        const dateString = date.toISOString()
        if (!acc[dateString]) {
          acc[dateString] = {
            pnl: 0,
            commission: 0
          }
        }
        acc[dateString].pnl += parseFloat(trade.pnl) || 0
        acc[dateString].commission += trade.commission || 0
        return acc
      }, {} as Record<string, { pnl: number, commission: number }>)

      let cumulativePnL = 0
      return Object.entries(dailyPnL)
        .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
        .map(([date, { pnl, commission }]) => {
          const dailyNetPnL = pnl - commission
          cumulativePnL += dailyNetPnL
          return {
            date,
            equity: cumulativePnL,
            dailyPnL: dailyNetPnL,
            equityFormatted: `$${cumulativePnL.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
            dailyPnLFormatted: `$${dailyNetPnL.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
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
          const tradePnL = (parseFloat(trade.pnl) || 0) - (trade.commission || 0)
          cumulativePnL += tradePnL
          return {
            date: trade.sellDate || trade.buyDate,
            equity: cumulativePnL,
            dailyPnL: tradePnL,
            equityFormatted: `$${cumulativePnL.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
            dailyPnLFormatted: `$${tradePnL.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
          }
        })
    }
  }, [trades, showDailyPnL])

  return (
    <Card>
      <CardHeader className="sm:min-h-[200px] md:min-h-[120px] flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>Equity Curve</CardTitle>
          <CardDescription>
            Showing cumulative profit and loss over time
          </CardDescription>
        </div>
        <div className="flex">
          {["daily", "per-trade"].map((key) => {
            return (
              <button
                key={key}
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
            <ResponsiveContainer width="100%" height="100%">
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
                  domain={['auto', 'auto']}
                />
                <ChartTooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="equity"
                  name="Equity"
                  stroke={`var(--color-equity)`}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
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