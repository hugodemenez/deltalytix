'use client'

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export default function TickDistributionChartEmbed({ trades }: { trades: { pnl: number, quantity: number, instrument?: string }[], tickDetails?: Record<string, { tickValue: number }> }) {
  const chartData = React.useMemo(() => {
    if (!trades.length) return []

    const tickCounts: Record<number, number> = {}

    trades.forEach(trade => {
      const tickValue = 1 // embed keeps simple; caller can pre-process if needed
      const pnlPerContract = Number(trade.pnl) / Math.max(1, Number(trade.quantity))
      const ticks = Math.round(pnlPerContract / tickValue)
      tickCounts[ticks] = (tickCounts[ticks] || 0) + 1
    })

    return Object.entries(tickCounts)
      .map(([tick, count]) => ({
        ticks: tick === '0' ? '0' : Number(tick) > 0 ? `+${tick}` : `${tick}`,
        count
      }))
      .sort((a, b) => Number(a.ticks.replace('+', '')) - Number(b.ticks.replace('+', '')))
  }, [trades])

  const formatCount = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString())

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-[56px]">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle className="line-clamp-1 text-base">Tick Distribution</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Info className="text-muted-foreground hover:text-foreground transition-colors cursor-help h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent side="top">
                <p>Distribution of trades by PnL ticks per contract.</p>
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
                dataKey="ticks"
                tickLine={false}
                axisLine={false}
                height={24}
                tickMargin={8}
                tick={(props) => {
                  const { x, y, payload } = props as any
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={0} y={0} dy={4} textAnchor="middle" fill="currentColor" fontSize={11}>
                        {payload.value}
                      </text>
                    </g>
                  )
                }}
                interval="preserveStartEnd"
                allowDataOverflow
              />
              <YAxis tickLine={false} axisLine={false} width={45} tickMargin={4} tickFormatter={formatCount} tick={{ fontSize: 11, fill: 'currentColor' }} />
              <Tooltip wrapperStyle={{ fontSize: '12px', zIndex: 1000 }} formatter={(val: any, name: string, p: any) => [`${val}`, 'Trades']} labelFormatter={(label) => `${label} ticks`} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={40} className="transition-all duration-300 ease-in-out">
                {chartData.map((entry) => (
                  <Cell key={`cell-${entry.ticks}`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
