'use client'

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export default function CommissionsPnLEmbed({ trades }: { trades: { pnl: number, commission: number }[] }) {
  const chartData = React.useMemo(() => {
    const totalPnL = trades.reduce((s, t) => s + (t.pnl || 0), 0)
    const totalCommissions = trades.reduce((s, t) => s + (t.commission || 0), 0)
    const total = Math.abs(totalPnL) + Math.abs(totalCommissions) || 1
    return [
      { name: 'Net PnL', value: totalPnL, percentage: totalPnL / total, fill: 'hsl(var(--chart-3))' },
      { name: 'Commissions', value: totalCommissions, percentage: totalCommissions / total, fill: 'hsl(var(--chart-4))' },
    ]
  }, [trades])

  const formatCurrency = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-[56px]">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle className="line-clamp-1 text-base">Commissions vs Net PnL</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Info className="text-muted-foreground hover:text-foreground transition-colors cursor-help h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent side="top">
                <p>Share of total PnL vs total commissions.</p>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-2 sm:p-4">
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={70 * 0.6} outerRadius={70} paddingAngle={2}>
                {chartData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.fill} className="transition-all duration-300 ease-in-out" />
                ))}
              </Pie>
              <Tooltip wrapperStyle={{ fontSize: '12px', zIndex: 1000 }} formatter={(value: any, name: string, p: any) => [
                formatCurrency(value as number),
                name,
              ]} />
              <Legend verticalAlign="bottom" align="center" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
