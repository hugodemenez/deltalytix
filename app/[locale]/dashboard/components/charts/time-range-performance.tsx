"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { Info } from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'
import { useI18n } from "@/locales/client"
import { Trade } from "@/prisma/generated/prisma/browser"
import { Button } from "@/components/ui/button"
import { ChartConfig } from "@/components/ui/chart"

interface TimeRangePerformanceChartProps {
  size?: WidgetSize
}

function getTimeRangeKey(timeInPosition: number): string {
  const minutes = timeInPosition / 60 // Convert seconds to minutes
  if (minutes < 1) return 'under1min'
  if (minutes >= 1 && minutes < 5) return '1to5min'
  if (minutes >= 5 && minutes < 10) return '5to10min'
  if (minutes >= 10 && minutes < 15) return '10to15min'
  if (minutes >= 15 && minutes < 30) return '15to30min'
  if (minutes >= 30 && minutes < 60) return '30to60min'
  if (minutes >= 60 && minutes < 120) return '1to2hours'
  if (minutes >= 120 && minutes < 300) return '2to5hours'
  return 'over5hours'
}

function getTimeRangeLabel(range: string): string {
  const labels: Record<string, string> = {
    under1min: '< 1m',
    '1to5min': '1-5m',
    '5to10min': '5-10m',
    '10to15min': '10-15m',
    '15to30min': '15-30m',
    '30to60min': '30-60m',
    '1to2hours': '1-2h',
    '2to5hours': '2-5h',
    over5hours: '> 5h'
  }
  return labels[range] || range
}

function getColorByWinRate(winRate: number): string {
  if (winRate === 0) return "hsl(var(--muted-foreground))"
  return winRate >= 50 ? "hsl(var(--chart-win))" : "hsl(var(--chart-loss))"
}

const chartConfig = {
  avgPnl: {
    label: "Average PnL",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export default function TimeRangePerformanceChart({ size = 'medium' }: TimeRangePerformanceChartProps) {
  const { formattedTrades: trades, timeRange, setTimeRange } = useData()
  const t = useI18n()
  const [activeRange, setActiveRange] = React.useState<string | null>(null)

  const chartData = React.useMemo(() => {
    const timeRangeData: Record<string, {
      totalPnl: number
      winCount: number
      lossCount: number
      totalTrades: number
    }> = {
      under1min: { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      '1to5min': { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      '5to10min': { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      '10to15min': { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      '15to30min': { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      '30to60min': { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      '1to2hours': { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      '2to5hours': { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 },
      'over5hours': { totalPnl: 0, winCount: 0, lossCount: 0, totalTrades: 0 }
    }

    trades.forEach((trade: Trade) => {
      const timeRange = getTimeRangeKey(trade.timeInPosition)
      timeRangeData[timeRange].totalPnl += trade.pnl
      timeRangeData[timeRange].totalTrades++
      if (trade.pnl > 0) {
        timeRangeData[timeRange].winCount++
      } else {
        timeRangeData[timeRange].lossCount++
      }
    })

    return Object.entries(timeRangeData).map(([range, data]) => {
      const winRate = data.totalTrades > 0 ? (data.winCount / data.totalTrades) * 100 : 0
      return {
        range,
        avgPnl: data.totalTrades > 0 ? data.totalPnl / data.totalTrades : 0,
        winRate,
        trades: data.totalTrades,
        color: getColorByWinRate(winRate)
      }
    })
  }, [trades])

  const handleClick = React.useCallback(() => {
    if (!activeRange) return
    if (timeRange.range === activeRange) {
      setTimeRange({ range: null })
    } else {
      setTimeRange({ range: activeRange })
    }
  }, [activeRange, timeRange.range, setTimeRange])

  const CustomTooltip = ({ active, payload, label }: any) => {
    React.useEffect(() => {
      if (active && payload && payload.length) {
        setActiveRange(payload[0].payload.range)
      } else {
        setActiveRange(null)
      }
    }, [active, payload])

    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border bg-background p-2 shadow-xs">
          <div className="grid gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t('timeRangePerformance.tooltip.timeRange')}
              </span>
              <span className={cn(
                "font-bold",
                timeRange.range === data.range ? "text-primary" : "text-muted-foreground"
              )}>
                {getTimeRangeLabel(label)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t('timeRangePerformance.tooltip.avgPnl')}
              </span>
              <span className="font-bold">
                {data.avgPnl.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t('timeRangePerformance.tooltip.winRate')}
              </span>
              <span className="font-bold" style={{ color: data.color }}>
                {data.winRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t('timeRangePerformance.tooltip.trades.one', { count: data.trades })}
              </span>
              <span className="font-bold text-muted-foreground">
                {data.trades === 1 
                  ? t('timeRangePerformance.tooltip.trades.one', { count: data.trades })
                  : t('timeRangePerformance.tooltip.trades.other', { count: data.trades })
                }
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
          "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
          size === 'small' ? "p-2 h-10" : "p-3 sm:p-4 h-14"
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle 
              className={cn(
                "line-clamp-1",
                size === 'small' ? "text-sm" : "text-base"
              )}
            >
              {t('timeRangePerformance.title')}
            </CardTitle>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('timeRangePerformance.description')}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          {timeRange.range && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 lg:px-3"
              onClick={() => setTimeRange({ range: null })}
            >
              {t('timeRangePerformance.clearFilter')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          "flex-1 min-h-0",
          size === 'small' ? "p-1" : "p-2 sm:p-4"
        )}
      >
        <div 
          className="w-full h-full cursor-pointer" 
          onClick={handleClick}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={
                size === 'small'
                  ? { left: 0, right: 4, top: 4, bottom: 20 }
                  : { left: 0, right: 8, top: 8, bottom: 24 }
              }
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="text-border dark:opacity-[0.12] opacity-[0.2]"
              />
              <XAxis
                dataKey="range"
                tickLine={false}
                axisLine={false}
                height={size === 'small' ? 20 : 24}
                tickMargin={size === 'small' ? 4 : 8}
                tick={(props) => {
                  const { x, y, payload } = props;
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        x={0}
                        y={0}
                        dy={size === 'small' ? 8 : 4}
                        textAnchor={size === 'small' ? 'end' : 'middle'}
                        fill="currentColor"
                        fontSize={size === 'small' ? 9 : 11}
                        transform={size === 'small' ? 'rotate(-45)' : 'rotate(0)'}
                      >
                        {getTimeRangeLabel(payload.value)}
                      </text>
                    </g>
                  );
                }}
                interval="preserveStartEnd"
                allowDataOverflow={true}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={45}
                tickMargin={4}
                tick={{ 
                  fontSize: size === 'small' ? 9 : 11,
                  fill: 'currentColor'
                }}
              />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ 
                  fontSize: size === 'small' ? '10px' : '12px',
                  zIndex: 1000
                }} 
              />
              <Bar
                dataKey="avgPnl"
                fill={chartConfig.avgPnl.color}
                radius={[3, 3, 0, 0]}
                maxBarSize={size === 'small' ? 25 : 40}
                className="transition-all duration-300 ease-in-out"
                opacity={timeRange.range ? 0.3 : 1}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-${entry.range}`}
                    fill={entry.color}
                    opacity={timeRange.range === entry.range ? 1 : (timeRange.range ? 0.3 : 1)}
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