'use client'

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export default function ContractQuantityChartEmbed({ trades }: { trades: { quantity: number, entryDate?: string | Date }[] }) {
  const chartData = React.useMemo(() => {
    const byHour: Record<number, { totalQuantity: number; count: number }> = {}
    for (let h = 0; h < 24; h++) byHour[h] = { totalQuantity: 0, count: 0 }

    trades.forEach((t) => {
      if (!t.entryDate) return
      const d = typeof t.entryDate === 'string' ? new Date(t.entryDate) : t.entryDate
      if (Number.isNaN(d.getTime())) return
      const hour = d.getUTCHours()
      byHour[hour].totalQuantity += Number(t.quantity) || 0
      byHour[hour].count += 1
    })

    return Object.entries(byHour)
      .map(([hour, v]) => ({ hour: Number(hour), totalQuantity: v.totalQuantity, tradeCount: v.count }))
      .sort((a, b) => a.hour - b.hour)
  }, [trades])

  const maxTradeCount = React.useMemo(() => Math.max(1, ...chartData.map(d => d.tradeCount)), [chartData])
  const getColor = (count: number) => `hsl(var(--chart-1) / ${Math.max(0.2, count / maxTradeCount)})`

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background p-2 border rounded shadow-xs" style={{
          background: 'hsl(var(--embed-tooltip-bg, var(--background)))',
          borderColor: 'hsl(var(--embed-tooltip-border, var(--border)))',
          borderRadius: 'var(--embed-tooltip-radius, 0.5rem)'
        }}>
          <p className="font-semibold">{`${label}:00 - ${(label + 1) % 24}:00`}</p>
          <p className="font-bold">Total Contracts: {data.totalQuantity}</p>
          <p>Trades: {data.tradeCount}</p>
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
            <CardTitle className="line-clamp-1 text-base">Contracts by Hour</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Info className="text-muted-foreground hover:text-foreground transition-colors cursor-help h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent side="top">
                <p>Total number of contracts traded by entry hour (UTC).</p>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-2 sm:p-4">
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" className="text-border dark:opacity-[0.12] opacity-[0.2]" />
              <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => `${v}h`} ticks={[0,3,6,9,12,15,18,21]} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v: number) => v.toFixed(0)} />
              <Tooltip content={<CustomTooltip />} contentStyle={{
                background: 'hsl(var(--embed-tooltip-bg, var(--background)))',
                borderColor: 'hsl(var(--embed-tooltip-border, var(--border)))',
                borderRadius: 'var(--embed-tooltip-radius, 0.5rem)'
              }} />
              <Bar dataKey="totalQuantity" radius={[4,4,0,0]} className="transition-all duration-300 ease-in-out">
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
