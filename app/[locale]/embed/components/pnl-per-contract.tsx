'use client'

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useI18n } from '@/locales/client'

type TradeLike = {
  instrument?: string
  pnl: number
  commission?: number
  quantity: number
}

function formatCurrency(value: number) {
  // Handle NaN and invalid numbers
  if (!isFinite(value) || isNaN(value)) {
    return '$0'
  }
  
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${value < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${value < 0 ? '-' : ''}$${(abs / 1_000).toFixed(1)}k`
  return `${value < 0 ? '-' : ''}$${abs.toFixed(0)}`
}

export default function PnLPerContractChartEmbed({ trades }: { trades: TradeLike[] }) {
  const t = useI18n()
  const chartData = React.useMemo(() => {
    const groups: Record<string, { totalPnl: number; totalContracts: number; winCount: number; trades: number }> = {}

    trades.forEach((trade) => {
      const instrument = trade.instrument || 'Unknown'
      const netPnl = (isFinite(trade.pnl) ? trade.pnl : 0) - (isFinite(trade.commission || 0) ? (trade.commission || 0) : 0)
      const quantity = isFinite(trade.quantity) ? trade.quantity : 0
      
      if (!groups[instrument]) groups[instrument] = { totalPnl: 0, totalContracts: 0, winCount: 0, trades: 0 }
      groups[instrument].totalPnl += netPnl
      groups[instrument].totalContracts += quantity
      groups[instrument].trades += 1
      if (netPnl > 0) groups[instrument].winCount += 1
    })

    return Object.entries(groups)
      .map(([instrument, data]) => ({
        instrument,
        averagePnl: data.totalContracts > 0 ? data.totalPnl / data.totalContracts : 0,
        totalPnl: data.totalPnl,
        tradeCount: data.trades,
        winCount: data.winCount,
        totalContracts: data.totalContracts,
      }))
      .sort((a, b) => b.averagePnl - a.averagePnl)
  }, [trades])

  const maxPnL = React.useMemo(() => Math.max(0, ...chartData.map(d => d.averagePnl)), [chartData])
  const minPnL = React.useMemo(() => Math.min(0, ...chartData.map(d => d.averagePnl)), [chartData])
  const absMax = React.useMemo(() => Math.max(Math.abs(maxPnL), Math.abs(minPnL)), [maxPnL, minPnL])

  const getColor = (value: number) => {
    // Handle NaN and invalid numbers
    if (!isFinite(value) || isNaN(value)) {
      return `hsl(var(--chart-win) / 0.2)`
    }
    
    const ratio = absMax === 0 ? 0.2 : Math.max(0.2, Math.abs(value / absMax))
    const base = value >= 0 ? '--chart-win' : '--chart-loss'
    return `hsl(var(${base}) / ${ratio})`
  }

  const CustomTooltip = ({ active, payload }: any) => {
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
              <span className="text-[0.70rem] uppercase text-muted-foreground">{t('embed.pnlPerContract.tooltip.averagePnl')}</span>
              <span className="font-bold">{formatCurrency(data.averagePnl)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">{t('embed.pnlPerContract.tooltip.totalPnl')}</span>
              <span className="font-bold text-muted-foreground">{formatCurrency(data.totalPnl)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">{t('embed.pnlPerContract.tooltip.trades')}</span>
              <span className="font-bold text-muted-foreground">{data.tradeCount}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">{t('embed.pnlPerContract.tooltip.totalContracts')}</span>
              <span className="font-bold text-muted-foreground">{data.totalContracts}</span>
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
            <CardTitle className="line-clamp-1 text-base">{t('embed.pnlPerContract.title')}</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Info className="text-muted-foreground hover:text-foreground transition-colors cursor-help h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent side="top">
                <p>{t('embed.pnlPerContract.description')}</p>
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
                dataKey="instrument"
                tickLine={false}
                axisLine={false}
                height={24}
                tickMargin={8}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                angle={-45}
                textAnchor="end"
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
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Tooltip content={<CustomTooltip />} wrapperStyle={{ fontSize: '12px', zIndex: 1000 }} />
              <Bar dataKey="averagePnl" radius={[3, 3, 0, 0]} maxBarSize={40} className="transition-all duration-300 ease-in-out">
                {chartData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={getColor(entry.averagePnl)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
