'use client'

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useI18n } from '@/locales/client'

type TradeLike = {
  entryDate?: string | Date
  timeInPosition: number // seconds
}

function formatTime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hours > 0) return mins > 0 ? `${hours}h${mins}m` : `${hours}h`
  return `${mins}m`
}

export default function TimeInPositionByHourChart({ trades }: { trades: TradeLike[] }) {
  const t = useI18n()
  
  const chartData = React.useMemo(() => {
    const hourlyData: Record<number, { totalTime: number; count: number }> = {}
    for (let h = 0; h < 24; h++) hourlyData[h] = { totalTime: 0, count: 0 }

    trades.forEach((trade) => {
      if (!trade.entryDate) return
      const d = typeof trade.entryDate === 'string' ? new Date(trade.entryDate) : trade.entryDate
      if (Number.isNaN(d.getTime())) return
      const hour = d.getUTCHours()
      hourlyData[hour].totalTime += trade.timeInPosition / 60
      hourlyData[hour].count += 1
    })

    return Object.entries(hourlyData)
      .map(([hour, { totalTime, count }]) => ({
        hour: Number(hour),
        avgTimeInPosition: count > 0 ? totalTime / count : 0,
        tradeCount: count,
      }))
      .sort((a, b) => a.hour - b.hour)
  }, [trades])

  const maxTradeCount = React.useMemo(() => Math.max(1, ...chartData.map(d => d.tradeCount)), [chartData])
  const getColor = (count: number) => `hsl(var(--chart-2) / ${Math.max(0.2, count / maxTradeCount)})`

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border bg-background p-2 shadow-xs" style={{
          background: 'hsl(var(--embed-tooltip-bg, var(--background)))',
          borderColor: 'hsl(var(--embed-tooltip-border, var(--border)))',
          borderRadius: 'var(--embed-tooltip-radius, 0.5rem)'
        }}>
          <div className="grid gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">{t('embed.timeInPosition.tooltip.time')}</span>
              <span className="font-bold text-muted-foreground">{`${label}:00 - ${(label + 1) % 24}:00`}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">{t('embed.timeInPosition.tooltip.averageDuration')}</span>
              <span className="font-bold">{formatTime(data.avgTimeInPosition)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">{t('embed.timeInPosition.tooltip.trades')}</span>
              <span className="font-bold text-muted-foreground">{data.tradeCount}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-[56px]">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle className="line-clamp-1 text-base">{t('embed.timeInPosition.title')}</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Info className="text-muted-foreground hover:text-foreground transition-colors cursor-help h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent side="top">
                <p>{t('embed.timeInPosition.description')}</p>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-2 sm:p-4">
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" className="text-border dark:opacity-[0.12] opacity-[0.2]" />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                height={24}
                tickMargin={8}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                tickFormatter={(v) => `${v}h`}
                ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={50}
                tickMargin={4}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                tickFormatter={formatTime}
              />
              <Tooltip content={<CustomTooltip />} wrapperStyle={{ fontSize: '12px', zIndex: 1000 }} />
              <Bar dataKey="avgTimeInPosition" radius={[3, 3, 0, 0]} maxBarSize={40} className="transition-all duration-300 ease-in-out">
                {chartData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={getColor(entry.tradeCount)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
