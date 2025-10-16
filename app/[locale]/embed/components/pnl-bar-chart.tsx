'use client'

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export type EmbedTrade = {
  pnl: number
  entryDate?: string | Date
  side?: 'long' | 'short' | string
}

function formatCurrency(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${value < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${value < 0 ? '-' : ''}$${(abs / 1_000).toFixed(1)}k`
  return `${value < 0 ? '-' : ''}$${abs.toFixed(0)}`
}

export default function DailyPnLChartEmbed({ trades }: { trades: EmbedTrade[] }) {
  const chartData = React.useMemo(() => {
    const byDate: Record<string, { pnl: number; longNumber: number; shortNumber: number }> = {}

    trades.forEach((t) => {
      if (!t.entryDate) return
      const d = typeof t.entryDate === 'string' ? new Date(t.entryDate) : t.entryDate
      if (Number.isNaN(d.getTime())) return
      const dateKey = d.toISOString().slice(0, 10)
      if (!byDate[dateKey]) byDate[dateKey] = { pnl: 0, longNumber: 0, shortNumber: 0 }
      byDate[dateKey].pnl += t.pnl
      const side = (t.side || '').toLowerCase()
      if (side === 'long') byDate[dateKey].longNumber += 1
      else if (side === 'short') byDate[dateKey].shortNumber += 1
    })

    return Object.entries(byDate)
      .map(([date, v]) => ({ date, pnl: v.pnl, longNumber: v.longNumber, shortNumber: v.shortNumber }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [trades])

  const maxPnL = React.useMemo(() => Math.max(0, ...chartData.map((d) => d.pnl)), [chartData])
  const minPnL = React.useMemo(() => Math.min(0, ...chartData.map((d) => d.pnl)), [chartData])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background p-2 border rounded shadow-xs">
          <p className="font-semibold">{data.date}</p>
          <p className={`font-bold ${data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>PnL: {formatCurrency(data.pnl)}</p>
          <p>Long trades: {data.longNumber}</p>
          <p>Short trades: {data.shortNumber}</p>
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
            <CardTitle className="line-clamp-1 text-base">Daily PnL</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Info className="text-muted-foreground hover:text-foreground transition-colors cursor-help h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent side="top">
                <p>Daily total PnL aggregated from trades. Tooltip shows long/short counts.</p>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-2 sm:p-4">
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 10, right: 8, top: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" className="text-border dark:opacity-[0.12] opacity-[0.2]" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                height={24}
                tickMargin={8}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                minTickGap={50}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={60}
                tickMargin={4}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                tickFormatter={formatCurrency}
                domain={[Math.min(minPnL * 1.1, 0), Math.max(maxPnL * 1.1, 0)]}
              />
              <Tooltip content={<CustomTooltip />} wrapperStyle={{ fontSize: '12px', zIndex: 1000 }} />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={40} className="transition-all duration-300 ease-in-out">
                {chartData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.pnl >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-1))'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
