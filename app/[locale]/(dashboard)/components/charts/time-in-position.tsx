"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useFormattedTrades } from "@/components/context/trades-data"
import { Trade } from "@prisma/client"
import { cn } from "@/lib/utils"

interface TimeInPositionChartProps {
  size?: 'small' | 'medium' | 'large' | 'small-long'
}

const chartConfig = {
  avgTimeInPosition: {
    label: "Average Time in Position (minutes)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

export default function TimeInPositionChart({ size = 'medium' }: TimeInPositionChartProps) {
  const { formattedTrades: trades } = useFormattedTrades()

  const chartData = React.useMemo(() => {
    const hourlyData: { [hour: string]: { totalTime: number; count: number } } = {}
    
    // Initialize hourly data for all 24 hours
    for (let i = 0; i < 24; i++) {
      hourlyData[i.toString()] = { totalTime: 0, count: 0 }
    }

    // Sum up time in position and count trades for each hour
    trades.forEach((trade: Trade) => {
      const hour = new Date(trade.entryDate).getHours().toString()
      hourlyData[hour].totalTime += trade.timeInPosition / 60 // Convert seconds to minutes
      hourlyData[hour].count++
    })

    // Convert to array format for Recharts and calculate average time in position
    return Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgTimeInPosition: data.count > 0 ? data.totalTime / data.count : 0,
        tradeCount: data.count,
      }))
      .sort((a, b) => a.hour - b.hour)
  }, [trades])

  const maxTradeCount = Math.max(...chartData.map(data => data.tradeCount))

  const getColor = (count: number) => {
    const intensity = Math.max(0.2, count / maxTradeCount)
    return `hsl(var(--chart-3) / ${intensity})`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background p-2 border rounded shadow-sm">
          <p className="font-semibold">{`${label}h - ${(label + 1) % 24}h`}</p>
          <p className="font-bold">Avg Time in Position: {formatTime(data.avgTimeInPosition)}</p>
          <p>Number of Trades: {data.tradeCount}</p>
        </div>
      )
    }
    return null
  }

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

  const getYAxisWidth = () => {
    return (size === 'small' || size === 'small-long') ? 35 : 45;
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
            Average Time in Position
          </CardTitle>
        </div>
        <CardDescription 
          className={cn(
            (size === 'small' || size === 'small-long') ? "hidden" : "text-xs sm:text-sm"
          )}
        >
          Showing average time in position for each hour of the day
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
            <BarChart
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
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                tickMargin={(size === 'small' || size === 'small-long') ? 4 : 8}
                tick={{ fontSize: (size === 'small' || size === 'small-long') ? 10 : 12 }}
                tickFormatter={(value) => `${value}h`}
                ticks={(size === 'small' || size === 'small-long') ? [0, 6, 12, 18] : [0, 3, 6, 9, 12, 15, 18, 21]}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={(size === 'small' || size === 'small-long') ? 4 : 8}
                tick={{ 
                  fontSize: (size === 'small' || size === 'small-long') ? 10 : 12,
                  fill: 'currentColor'
                }}
                width={getYAxisWidth()}
                tickFormatter={(value) => `${Math.round(value)}m`}
                label={(size === 'small' || size === 'small-long') ? undefined : { 
                  value: "Minutes", 
                  angle: -90, 
                  position: 'insideLeft',
                  fontSize: 12
                }}
              />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ 
                  fontSize: (size === 'small' || size === 'small-long') ? '10px' : '12px'
                }} 
              />
              <Bar
                dataKey="avgTimeInPosition"
                radius={[4, 4, 0, 0]}
                maxBarSize={(size === 'small' || size === 'small-long') ? 30 : 50}
                className="transition-all duration-300 ease-in-out"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColor(entry.tradeCount)}
                  />
                ))}
              </Bar>
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}