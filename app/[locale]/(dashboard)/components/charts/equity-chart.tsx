"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, TooltipProps } from "recharts"
import { format, isValid, startOfDay } from 'date-fns'
import { cn } from "@/lib/utils"

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
import { useFormattedTrades, useTrades } from "../../../../../components/context/trades-data"

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

interface EquityChartProps {
  size?: 'small' | 'medium' | 'large' | 'small-long'
}

export default function EnhancedEquityChart({ size = 'medium' }: EquityChartProps) {
  const { formattedTrades:trades } = useFormattedTrades()
  const [showDailyPnL, setShowDailyPnL] = React.useState(true)

  const chartData = React.useMemo(() => {
    const validTrades = trades.filter(trade => {
      const buyDate = safeParseDate(trade.entryDate)
      return buyDate !== null
    })

    if (showDailyPnL) {
      // Calculate daily PnL
      const dailyPnL = validTrades.reduce((acc, trade) => {
        const date = safeParseDate(trade.closeDate || trade.entryDate)
        if (!date) return acc

        const dateString = date.toISOString()
        if (!acc[dateString]) {
          acc[dateString] = {
            pnl: 0,
            commission: 0
          }
        }
        acc[dateString].pnl += trade.pnl || 0
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
          const dateA = safeParseDate(a.entryDate)
          const dateB = safeParseDate(b.entryDate)
          return dateA && dateB ? dateA.getTime() - dateB.getTime() : 0
        })
        .map((trade) => {
          const tradePnL = (trade.pnl || 0) - (trade.commission || 0)
          cumulativePnL += tradePnL
          return {
            date: trade.closeDate || trade.entryDate,
            equity: cumulativePnL,
            dailyPnL: tradePnL,
            equityFormatted: `$${cumulativePnL.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
            dailyPnLFormatted: `$${tradePnL.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
          }
        })
    }
  }, [trades, showDailyPnL])

  const getChartHeight = () => {
    switch (size) {
      case 'small':
      case 'small-long':
        return 'h-[140px]'
      case 'medium':
        return 'h-[240px]'
      case 'large':
        return 'h-[280px]'
      default:
        return 'h-[240px]'
    }
  }

  return (
    <Card className="h-full">
      <CardHeader 
        className={cn(
          "flex flex-col items-stretch space-y-0 border-b",
          (size === 'small' || size === 'small-long')
            ? "p-2" 
            : "p-4 sm:p-6"
        )}
      >
        <div className="flex items-center justify-between">
          <CardTitle 
            className={cn(
              "line-clamp-1",
              (size === 'small' || size === 'small-long') ? "text-sm" : "text-base sm:text-lg"
            )}
          >
            Equity Curve
          </CardTitle>
          {!(size === 'small' || size === 'small-long') && (
            <div className="flex">
              {["daily", "per-trade"].map((key) => (
                <button
                  key={key}
                  data-active={showDailyPnL === (key==="daily")}
                  className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-4 py-2 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-6 sm:py-4"
                  onClick={() => setShowDailyPnL(key==="daily")}
                >
                  <span className="text-xs text-muted-foreground">
                    {key==="daily" ? "Daily PnL" : "Per-trade PnL"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <CardDescription 
          className={cn(
            (size === 'small' || size === 'small-long') ? "hidden" : "text-xs sm:text-sm"
          )}
        >
          Showing cumulative profit and loss over time
        </CardDescription>
      </CardHeader>
      <CardContent 
        className={cn(
          (size === 'small' || size === 'small-long') ? "p-1" : "p-2 sm:p-6"
        )}
      >
        <ChartContainer
          config={chartConfig}
          className={cn(
            "w-full",
            getChartHeight(),
            (size === 'small' || size === 'small-long')
              ? "aspect-[3/2]" 
              : "aspect-[4/3] sm:aspect-[16/9]"
          )}
        >
          {chartData.length > 0 ? (
              <LineChart
                data={chartData}
                margin={
                  (size === 'small' || size === 'small-long')
                    ? { left: 10, right: 4, top: 4, bottom: 0 }
                    : { left: 16, right: 8, top: 8, bottom: 0 }
                }
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  opacity={(size === 'small' || size === 'small-long') ? 0.5 : 1}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={(size === 'small' || size === 'small-long') ? 4 : 8}
                  minTickGap={(size === 'small' || size === 'small-long') ? 16 : 32}
                  tick={{ fontSize: (size === 'small' || size === 'small-long') ? 10 : 12 }}
                  tickFormatter={(value) => {
                    const date = safeParseDate(value)
                    return date ? format(date, (size === 'small' || size === 'small-long') ? 'MM/dd' : 'MMM dd') : ''
                  }}
                />
                <YAxis
                  tickFormatter={(value) => {
                    if (size === 'small' || size === 'small-long') {
                      return value >= 1000 
                        ? `$${(value / 1000).toFixed(0)}k` 
                        : `$${value}`
                    }
                    return `$${value.toLocaleString()}`
                  }}
                  domain={['auto', 'auto']}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={(size === 'small' || size === 'small-long') ? 4 : 8}
                  tick={{ fontSize: (size === 'small' || size === 'small-long') ? 10 : 12 }}
                  width={(size === 'small' || size === 'small-long') ? 35 : 45}
                />
                <ChartTooltip 
                  content={<CustomTooltip />}
                  wrapperStyle={{ 
                    fontSize: (size === 'small' || size === 'small-long') ? '10px' : '12px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="equity"
                  name="Equity"
                  stroke={`var(--color-equity)`}
                  dot={false}
                  strokeWidth={(size === 'small' || size === 'small-long') ? 1.5 : 2}
                />
              </LineChart>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className={cn(
                "text-muted-foreground",
                (size === 'small' || size === 'small-long') ? "text-xs" : "text-sm"
              )}>
                No data available
              </p>
            </div>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}