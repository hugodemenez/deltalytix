"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useUserData } from "@/components/context/user-data"
import { cn } from "@/lib/utils"
import { Info } from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { WidgetSize } from '@/app/[locale]/(dashboard)/types/dashboard'
import { useI18n } from "@/locales/client"
import { Trade } from "@prisma/client"

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
  return winRate >= 50 ? "hsl(var(--success))" : "hsl(var(--destructive))"
}

export default function TimeRangePerformanceChart({ size = 'medium' }: TimeRangePerformanceChartProps) {
  const { formattedTrades: trades } = useUserData()
  const t = useI18n()

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t('timeRangePerformance.tooltip.timeRange')}
              </span>
              <span className="font-bold text-muted-foreground">
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
              {t('timeRangePerformance.title')}
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
                  <p>{t('timeRangePerformance.description')}</p>
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
        <div className="w-full h-full">
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
                dataKey="range"
                tickLine={false}
                axisLine={false}
                height={size === 'small-long' ? 20 : 24}
                tickMargin={size === 'small-long' ? 4 : 8}
                tick={{ 
                  fontSize: size === 'small-long' ? 9 : 11,
                  fill: 'currentColor'
                }}
                tickFormatter={getTimeRangeLabel}
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
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 