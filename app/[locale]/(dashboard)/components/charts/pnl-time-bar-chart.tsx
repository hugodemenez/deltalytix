"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { useFormattedTrades } from "@/components/context/trades-data"
import { Trade } from "@prisma/client"
import { cn } from "@/lib/utils"
import { Info } from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ChartSize } from '@/app/[locale]/(dashboard)/types/dashboard'

interface TimeOfDayTradeChartProps {
  size?: ChartSize
}

const chartConfig = {
  avgPnl: {
    label: "Average P/L",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const formatCurrency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export default function TimeOfDayTradeChart({ size = 'medium' }: TimeOfDayTradeChartProps) {
  const { formattedTrades: trades } = useFormattedTrades()

  const chartData = React.useMemo(() => {
    const hourlyData: { [hour: string]: { totalPnl: number; count: number } } = {}
    
    // Initialize hourly data for all 24 hours
    for (let i = 0; i < 24; i++) {
      hourlyData[i.toString()] = { totalPnl: 0, count: 0 }
    }

    // Sum up PNL and count trades for each hour
    trades.forEach((trade: Trade) => {
      const hour = new Date(trade.entryDate).getHours().toString()
      hourlyData[hour].totalPnl += trade.pnl
      hourlyData[hour].count++
    })

    // Convert to array format for Recharts and calculate average PNL
    return Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgPnl: data.count > 0 ? data.totalPnl / data.count : 0,
        tradeCount: data.count,
      }))
      .sort((a, b) => a.hour - b.hour)
  }, [trades])

  const maxTradeCount = Math.max(...chartData.map(data => data.tradeCount))
  const maxPnL = Math.max(...chartData.map(data => data.avgPnl))
  const minPnL = Math.min(...chartData.map(data => data.avgPnl))

  const getColor = (count: number) => {
    const intensity = Math.max(0.2, count / maxTradeCount)
    return `hsl(var(--chart-4) / ${intensity})`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Time
              </span>
              <span className="font-bold text-muted-foreground">
                {`${label}:00 - ${(label + 1) % 24}:00`}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Average P/L
              </span>
              <span className="font-bold">
                {formatCurrency(data.avgPnl)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Trades
              </span>
              <span className="font-bold text-muted-foreground">
                {data.tradeCount} trade{data.tradeCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader 
        className={cn(
          "flex flex-col items-stretch space-y-0 border-b shrink-0",
          size === 'small-long' ? "p-2" : "p-3 sm:p-4"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CardTitle 
              className={cn(
                "line-clamp-1",
                size === 'small-long' ? "text-sm" : "text-base"
              )}
            >
              Average P/L by Hour
            </CardTitle>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Average profit/loss for each hour of the day</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>
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
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={
                size === 'small-long'
                  ? { left: 10, right: 4, top: 4, bottom: 20 }
                  : { left: 10, right: 8, top: 8, bottom: 24 }
              }
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="text-border dark:opacity-[0.12] opacity-[0.2]"
              />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                height={size === 'small-long' ? 20 : 24}
                tickMargin={size === 'small-long' ? 4 : 8}
                tick={{ 
                  fontSize: size === 'small-long' ? 9 : 11,
                  fill: 'currentColor'
                }}
                tickFormatter={(value) => `${value}h`}
                ticks={size === 'small-long' ? [0, 6, 12, 18] : [0, 3, 6, 9, 12, 15, 18, 21]}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={60}
                tickMargin={4}
                tick={{ 
                  fontSize: size === 'small-long' ? 9 : 11,
                  fill: 'currentColor'
                }}
                tickFormatter={formatCurrency}
              />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ 
                  fontSize: size === 'small-long' ? '10px' : '12px',
                  zIndex: 1000
                }} 
              />
              <Bar
                dataKey="avgPnl"
                radius={[3, 3, 0, 0]}
                maxBarSize={size === 'small-long' ? 25 : 40}
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
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}