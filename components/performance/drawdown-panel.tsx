'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { PerformanceData } from '@/lib/performance/types'

interface Props {
  data: PerformanceData | undefined
  isLoading: boolean
}

const money = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const pct = (v: number) => `${(v * 100).toFixed(2)}%`

export function DrawdownPanel({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4">
        <Card><CardContent className="pt-6"><Skeleton className="h-60 w-full" /></CardContent></Card>
      </div>
    )
  }

  if (!data) return null

  const { points, maxDrawdown, maxDrawdownPct, longestDrawdownDays, currentDrawdown, recoveryFactor } = data.drawdown

  const equityPoints = points.map(p => ({ ...p, date: p.date.slice(0, 10) }))
  const ddPoints = points.map(p => ({ ...p, date: p.date.slice(0, 10), dd: p.drawdown }))

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        {[
          { label: 'Max Drawdown', value: money(maxDrawdown), sub: pct(maxDrawdownPct), danger: true },
          { label: 'Current Drawdown', value: money(currentDrawdown), sub: '', danger: currentDrawdown < 0 },
          { label: 'Longest DD Period', value: `${Math.round(longestDrawdownDays)}d`, sub: '' },
          { label: 'Peak Equity', value: money(data.drawdown.peakEquity), sub: '' },
          { label: 'Recovery Factor', value: recoveryFactor.toFixed(2), sub: 'Net PnL / |Max DD|' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={`text-2xl font-bold tabular-nums mt-1 ${
                kpi.danger ? 'text-red-500' : ''
              }`}>{kpi.value}</p>
              {kpi.sub && <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {points.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            No trades in this period.
          </CardContent>
        </Card>
      )}

      {points.length > 0 && (
        <>
          {/* Equity curve */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Equity Curve</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={equityPoints}>
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={money} tick={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
                  <Tooltip formatter={(v: number) => money(v)} labelFormatter={l => `Date: ${l}`} />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="#22c55e"
                    fill="url(#equityGrad)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Drawdown curve */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Drawdown ($) from Peak</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={ddPoints}>
                  <defs>
                    <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={money} tick={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="#6b7280" />
                  <Tooltip formatter={(v: number) => money(v)} labelFormatter={l => `Date: ${l}`} />
                  <Area
                    type="monotone"
                    dataKey="dd"
                    stroke="#ef4444"
                    fill="url(#ddGrad)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
