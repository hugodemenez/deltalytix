"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { format } from 'date-fns'
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

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

import { useFormattedTrades } from "../../../../../components/context/trades-data"
import { ChartSize } from '@/app/[locale]/(dashboard)/types/dashboard'

interface EquityChartProps {
  size?: ChartSize
}

interface ChartDataPoint {
  date: string
  equity: number
  dailyPnL: number
  dailyCommissions: number
  netPnL: number
}

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const chartConfig = {
  equity: {
    label: "Equity",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export default function EquityChart({ size = 'medium' }: EquityChartProps) {
  const { formattedTrades: trades } = useFormattedTrades()
  const [showDailyPnL, setShowDailyPnL] = React.useState(true)

  const chartData = React.useMemo(() => {
    if (!trades.length) return []

    if (showDailyPnL) {
      const dailyStats: Record<string, { pnl: number; commissions: number }> = {}
      trades.forEach(trade => {
        const date = format(new Date(trade.entryDate), 'yyyy-MM-dd')
        if (!dailyStats[date]) {
          dailyStats[date] = { pnl: 0, commissions: 0 }
        }
        dailyStats[date].pnl += trade.pnl
        dailyStats[date].commissions += trade.commission || 0
      })

      let cumulativePnL = 0
      return Object.entries(dailyStats)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([date, stats]) => {
          const netPnL = stats.pnl - stats.commissions
          cumulativePnL += netPnL
          return {
            date,
            equity: cumulativePnL,
            dailyPnL: stats.pnl,
            dailyCommissions: stats.commissions,
            netPnL: netPnL
          }
        })
    } else {
      let cumulativePnL = 0
      return trades
        .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())
        .map(trade => {
          const netPnL = trade.pnl - (trade.commission || 0)
          cumulativePnL += netPnL
          return {
            date: format(new Date(trade.entryDate), 'yyyy-MM-dd HH:mm:ss'),
            equity: cumulativePnL,
            dailyPnL: trade.pnl,
            dailyCommissions: trade.commission || 0,
            netPnL: netPnL
          }
        })
    }
  }, [trades, showDailyPnL])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader 
        className={cn(
          "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
          size === 'small-long' ? "p-2" : "p-3 sm:p-4"
        )}
      >
        <div className="flex items-center gap-1.5">
          <CardTitle 
            className={cn(
              "line-clamp-1",
              size === 'small-long' ? "text-sm" : "text-base"
            )}
          >
            Equity Curve
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
                <p>Showing cumulative profit and loss over time</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {size !== 'small-long' && (
          <div className="flex shrink-0 gap-1">
            {["daily", "per-trade"].map((key) => (
              <button
                key={key}
                data-active={showDailyPnL === (key==="daily")}
                className={cn(
                  "relative px-2.5 py-1 text-sm rounded-md transition-colors",
                  "hover:bg-muted",
                  "data-[active=true]:bg-muted"
                )}
                onClick={() => setShowDailyPnL(key==="daily")}
              >
                {key==="daily" ? "Daily PnL" : "Per-trade PnL"}
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent 
        className={cn(
          "flex-1 min-h-0",
          size === 'small-long' ? "p-1" : "p-2 sm:p-4"
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
                  size === 'small-long'
                    ? { left: 35, right: 4, top: 4, bottom: 20 }
                    : { left: 45, right: 8, top: 8, bottom: 24 }
                }
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  opacity={size === 'small-long' ? 0.5 : 0.8}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  height={size === 'small-long' ? 20 : 24}
                  tickMargin={size === 'small-long' ? 4 : 8}
                  tick={{ 
                    fontSize: size === 'small-long' ? 9 : 11,
                    fill: 'currentColor'
                  }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return format(date, "MMM d")
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={size === 'small-long' ? 35 : 45}
                  tickMargin={size === 'small-long' ? 2 : 4}
                  tick={{ 
                    fontSize: size === 'small-long' ? 9 : 11,
                    fill: 'currentColor'
                  }}
                  tickFormatter={formatCurrency}
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ChartDataPoint
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Date
                              </span>
                              <span className="font-bold text-muted-foreground">
                                {format(new Date(data.date), "MMM d, yyyy")}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Equity
                              </span>
                              <span className="font-bold text-foreground">
                                {formatCurrency(data.equity)}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Gross P/L
                              </span>
                              <span
                                className={cn(
                                  "font-bold",
                                  data.dailyPnL > 0
                                    ? "text-green-500"
                                    : data.dailyPnL < 0
                                    ? "text-red-500"
                                    : "text-muted-foreground"
                                )}
                              >
                                {formatCurrency(data.dailyPnL)}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Commissions
                              </span>
                              <span className="font-bold text-red-500">
                                {formatCurrency(-data.dailyCommissions)}
                              </span>
                            </div>
                            <div className="flex flex-col border-t pt-2">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Net P/L
                              </span>
                              <span
                                className={cn(
                                  "font-bold",
                                  data.netPnL > 0
                                    ? "text-green-500"
                                    : data.netPnL < 0
                                    ? "text-red-500"
                                    : "text-muted-foreground"
                                )}
                              >
                                {formatCurrency(data.netPnL)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="equity"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 4,
                    style: { fill: "hsl(var(--chart-1))" }
                  }}
                  stroke="hsl(var(--chart-1))"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}