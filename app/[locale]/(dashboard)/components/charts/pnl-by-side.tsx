'use client'

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { useFormattedTrades } from "@/components/context/trades-data"
import { cn } from "@/lib/utils"
import { Info } from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { ChartSize } from '@/app/[locale]/(dashboard)/types/dashboard'

interface PnLBySideChartProps {
  size?: ChartSize
}

const chartConfig = {
  pnl: {
    label: "P/L",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const formatCurrency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Side
            </span>
            <span className="font-bold text-muted-foreground">
              {data.side}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {data.isAverage ? 'Average' : 'Total'} P/L
            </span>
            <span className="font-bold">
              {formatCurrency(data.pnl)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Win Rate
            </span>
            <span className="font-bold text-muted-foreground">
              {((data.winCount / data.tradeCount) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Trades
            </span>
            <span className="font-bold text-muted-foreground">
              {data.tradeCount} trade{data.tradeCount !== 1 ? 's' : ''} ({data.winCount} win{data.winCount !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function PnLBySideChart({ size = 'medium' }: PnLBySideChartProps) {
  const { formattedTrades: trades } = useFormattedTrades()
  const [showAverage, setShowAverage] = React.useState(true)

  const chartData = React.useMemo(() => {
    const longTrades = trades.filter(trade => trade.side?.toLowerCase() === 'long')
    const shortTrades = trades.filter(trade => trade.side?.toLowerCase() === 'short')

    const longPnL = longTrades.reduce((sum, trade) => sum + trade.pnl, 0)
    const shortPnL = shortTrades.reduce((sum, trade) => sum + trade.pnl, 0)

    const longWins = longTrades.filter(trade => trade.pnl > 0).length
    const shortWins = shortTrades.filter(trade => trade.pnl > 0).length

    return [
      {
        side: 'Long',
        pnl: showAverage ? (longTrades.length > 0 ? longPnL / longTrades.length : 0) : longPnL,
        tradeCount: longTrades.length,
        winCount: longWins,
        isAverage: showAverage
      },
      {
        side: 'Short',
        pnl: showAverage ? (shortTrades.length > 0 ? shortPnL / shortTrades.length : 0) : shortPnL,
        tradeCount: shortTrades.length,
        winCount: shortWins,
        isAverage: showAverage
      }
    ]
  }, [trades, showAverage])

  const maxPnL = Math.max(...chartData.map(d => d.pnl))
  const minPnL = Math.min(...chartData.map(d => d.pnl))
  const absMax = Math.max(Math.abs(maxPnL), Math.abs(minPnL))

  const getColor = (value: number) => {
    const ratio = Math.abs(value / absMax)
    const baseColorVar = value >= 0 ? '--chart-3' : '--chart-4'
    const intensity = Math.max(0.2, ratio)
    return `hsl(var(${baseColorVar}) / ${intensity})`
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
              P/L by Side
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
                  <p>Profit/loss comparison between long and short trades</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-muted-foreground",
              size === 'small-long' ? "text-xs" : "text-sm"
            )}>
              Show Average
            </span>
            <Switch
              checked={showAverage}
              onCheckedChange={setShowAverage}
              className="data-[state=checked]:bg-primary"
            />
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
                  ? { left: 35, right: 4, top: 4, bottom: 20 }
                  : { left: 45, right: 8, top: 8, bottom: 24 }
              }
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                opacity={size === 'small-long' ? 0.5 : 0.8}
              />
              <XAxis
                dataKey="side"
                tickLine={false}
                axisLine={false}
                height={size === 'small-long' ? 20 : 24}
                tickMargin={size === 'small-long' ? 4 : 8}
                tick={{ 
                  fontSize: size === 'small-long' ? 9 : 11,
                  fill: 'currentColor'
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
                tickFormatter={(value) => formatCurrency(value)}
                domain={[Math.min(minPnL * 1.1, 0), Math.max(maxPnL * 1.1, 0)]}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ 
                  fontSize: size === 'small-long' ? '10px' : '12px',
                  zIndex: 1000
                }} 
              />
              <Bar
                dataKey="pnl"
                radius={[3, 3, 0, 0]}
                maxBarSize={size === 'small-long' ? 25 : 40}
                className="transition-all duration-300 ease-in-out"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColor(entry.pnl)}
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