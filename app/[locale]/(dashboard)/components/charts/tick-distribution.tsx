"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { useFormattedTrades } from "../../../../../components/context/trades-data"
import { cn } from "@/lib/utils"
import { ChartSize } from '@/app/[locale]/(dashboard)/types/dashboard'
import { Info } from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getTickDetails } from "@/server/tick-details"
import { useI18n } from "@/locales/client"

interface TickDistributionProps {
  size?: ChartSize
}

interface ChartDataPoint {
  ticks: string;
  count: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
  label?: string;
}

const chartConfig = {
  count: {
    label: "Count",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  const t = useI18n()
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('tickDistribution.tooltip.ticks')}
            </span>
            <span className="font-bold text-muted-foreground">
              {data.ticks} {parseInt(data.ticks) !== 1 ? t('tickDistribution.tooltip.ticks_plural') : t('tickDistribution.tooltip.tick')}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('tickDistribution.tooltip.trades')}
            </span>
            <span className="font-bold">
              {data.count} {data.count !== 1 ? t('tickDistribution.tooltip.trades_plural') : t('tickDistribution.tooltip.trade')}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const formatCount = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }
  return value.toString()
}

export default function TickDistributionChart({ size = 'medium' }: TickDistributionProps) {
  const { formattedTrades: trades } = useFormattedTrades()
  const [tickDetails, setTickDetails] = React.useState<Record<string, number>>({})
  const t = useI18n()
  
  React.useEffect(() => {
    getTickDetails().then(details => {
      const tickMap = details.reduce((acc, detail) => {
        acc[detail.ticker] = detail.tickValue
        return acc
      }, {} as Record<string, number>)
      setTickDetails(tickMap)
    })
  }, [])

  const chartData = React.useMemo(() => {
    if (!trades.length || !Object.keys(tickDetails).length) return []

    // Get the range of ticks we want to display
    const maxTicks = 10 // Show distribution from -10 to +10 ticks
    const tickRange = Array.from({ length: 2 * maxTicks + 1 }, (_, i) => i - maxTicks)
    const tickCounts = tickRange.reduce((acc, tick) => {
      acc[tick] = 0
      return acc
    }, {} as Record<number, number>)

    // Count trades for each tick value
    trades.forEach(trade => {
      // Find the matching tick details by checking if the base instrument is included in the trade symbol
      const matchingTicker = Object.keys(tickDetails).find(ticker => 
        trade.instrument.includes(ticker)
      )
      const tickValue = matchingTicker ? tickDetails[matchingTicker] : 1
      const ticks = Math.round(trade.pnl / tickValue)
      // Only count ticks within our display range
      if (ticks >= -maxTicks && ticks <= maxTicks) {
        tickCounts[ticks] = (tickCounts[ticks] || 0) + 1
      }
    })

    return tickRange
      .map(tick => ({
        ticks: tick === 0 ? '0' : tick > 0 ? `+${tick}` : `${tick}`,
        count: tickCounts[tick]
      }))
  }, [trades, tickDetails])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader 
        className={cn(
          "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
          size === 'small-long' ? "p-2 h-[40px]" : "p-3 sm:p-4 h-[56px]"
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
              {t('tickDistribution.title')}
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
                  <p>{t('tickDistribution.description')}</p>
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
                  ? { left: 0, right: 4, top: 4, bottom: 20 }
                  : { left: 0, right: 8, top: 8, bottom: 24 }
              }
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="text-border dark:opacity-[0.12] opacity-[0.2]"
              />
              <XAxis
                dataKey="ticks"
                tickLine={false}
                axisLine={false}
                height={size === 'small-long' ? 20 : 24}
                tickMargin={size === 'small-long' ? 4 : 8}
                tick={{ 
                  fontSize: size === 'small-long' ? 9 : 11,
                  fill: 'currentColor'
                }}
                interval={size === 'small-long' ? 2 : 1}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={45}
                tickMargin={4}
                tick={{ 
                  fontSize: size === 'small-long' ? 9 : 11,
                  fill: 'currentColor'
                }}
                tickFormatter={formatCount}
              />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ 
                  fontSize: size === 'small-long' ? '10px' : '12px',
                  zIndex: 1000
                }} 
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--chart-1))"
                radius={[3, 3, 0, 0]}
                maxBarSize={size === 'small-long' ? 25 : 40}
                className="transition-all duration-300 ease-in-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
