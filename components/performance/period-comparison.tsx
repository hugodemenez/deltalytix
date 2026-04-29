'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { usePerformanceData } from '@/hooks/use-performance-data'
import { resolveDateRange, previousPeriod } from '@/lib/performance/date-utils'
import type { PeriodRange, PeriodStats } from '@/lib/performance/types'

interface Props {
  currentPeriod: PeriodRange
}

const money = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const pct = (v: number) => `${(v * 100).toFixed(1)}%`

function DeltaBadge({ current, previous, higherIsBetter = true }: {
  current: number
  previous: number
  higherIsBetter?: boolean
}) {
  if (previous === 0) return null
  const delta = ((current - previous) / Math.abs(previous)) * 100
  const isPositive = higherIsBetter ? delta > 0 : delta < 0
  return (
    <Badge variant={isPositive ? 'default' : 'destructive'} className="text-xs">
      {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
    </Badge>
  )
}

function StatRow({
  label, current, previous, format, higherIsBetter = true
}: {
  label: string
  current: number
  previous: number
  format: (v: number) => string
  higherIsBetter?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground tabular-nums">{format(previous)}</span>
        <span className="text-sm font-semibold tabular-nums">{format(current)}</span>
        <DeltaBadge current={current} previous={previous} higherIsBetter={higherIsBetter} />
      </div>
    </div>
  )
}

export function PeriodComparison({ currentPeriod }: Props) {
  const prevPeriod = previousPeriod(currentPeriod)
  const { data: curr, isLoading: currLoading } = usePerformanceData(currentPeriod)
  const { data: prev, isLoading: prevLoading } = usePerformanceData(prevPeriod)

  const { label: currLabel } = resolveDateRange(currentPeriod)
  const { label: prevLabel } = resolveDateRange(prevPeriod)

  if (currLoading || prevLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!curr || !prev) return null

  const c = curr.summary
  const p = prev.summary

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">{prevLabel}</span>
        <span className="text-muted-foreground">→</span>
        <span className="font-semibold">{currLabel}</span>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Period vs Period</CardTitle>
        </CardHeader>
        <CardContent>
          <StatRow label="Total Trades"  current={c.trades}       previous={p.trades}       format={v => String(v)} />
          <StatRow label="Win Rate"       current={c.winRate}      previous={p.winRate}      format={pct} />
          <StatRow label="Total P&L"      current={c.totalPnl}     previous={p.totalPnl}     format={money} />
          <StatRow label="Avg P&L / Trade" current={c.avgPnl}     previous={p.avgPnl}       format={money} />
          <StatRow label="Profit Factor"  current={c.profitFactor} previous={p.profitFactor} format={v => v.toFixed(2)} />
          <StatRow label="Avg R:R"        current={c.avgRR}        previous={p.avgRR}        format={v => v.toFixed(2)} />
          <StatRow label="Max Drawdown"   current={c.maxDrawdown}  previous={p.maxDrawdown}  format={money} higherIsBetter={false} />
          <StatRow label="Best Trade"     current={c.bestTrade}    previous={p.bestTrade}    format={money} />
          <StatRow label="Worst Trade"    current={c.worstTrade}   previous={p.worstTrade}   format={money} higherIsBetter={false} />
        </CardContent>
      </Card>
    </div>
  )
}
