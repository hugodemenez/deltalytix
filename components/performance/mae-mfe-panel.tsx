'use client'

import {
  ScatterChart,
  Scatter,
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

const pct = (v: number) => `${(v * 100).toFixed(1)}%`

export function MaeMfePanel({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
        ))}
      </div>
    )
  }

  if (!data) return null

  const { points, avgMae, avgMfe, avgEfficiency, avgRR } = data.maeMfe

  const scatterData = points.map(p => ({
    x: p.mae,
    y: p.mfe,
    pnl: p.pnl,
    name: p.instrument,
  }))

  const efficiencyData = points.map(p => ({
    x: p.mfe,
    y: p.pnl,
    efficiency: p.efficiency,
    name: p.instrument,
  }))

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: 'Avg MAE', value: money(avgMae), note: 'Max Adverse Excursion' },
          { label: 'Avg MFE', value: money(avgMfe), note: 'Max Favorable Excursion' },
          { label: 'Avg Efficiency', value: pct(avgEfficiency), note: 'PnL / MFE' },
          { label: 'Avg R:R', value: avgRR.toFixed(2), note: 'Risk / Reward Ratio' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {points.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            No MAE/MFE data available for this period.<br />
            <span className="text-xs">MAE/MFE requires Databento market data to be enabled.</span>
          </CardContent>
        </Card>
      )}

      {points.length > 0 && (
        <>
          {/* MAE vs MFE scatter */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                MAE vs MFE Scatter — each dot is one trade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="x"
                    name="MAE"
                    type="number"
                    tickFormatter={money}
                    tick={{ fontSize: 11 }}
                    label={{ value: 'MAE ($)', position: 'insideBottom', offset: -4, fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="y"
                    name="MFE"
                    type="number"
                    tickFormatter={money}
                    tick={{ fontSize: 11 }}
                    label={{ value: 'MFE ($)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="bg-background border rounded-lg shadow p-2 text-xs">
                          <p className="font-medium">{d.name}</p>
                          <p>MAE: {money(d.x)}</p>
                          <p>MFE: {money(d.y)}</p>
                          <p>P&L: {money(d.pnl)}</p>
                        </div>
                      )
                    }}
                  />
                  <Scatter
                    data={scatterData}
                    fill="hsl(var(--primary))"
                    fillOpacity={0.7}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Efficiency scatter: MFE vs P&L */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Execution Efficiency — how much of the MFE was captured
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="x"
                    name="MFE"
                    type="number"
                    tickFormatter={money}
                    tick={{ fontSize: 11 }}
                    label={{ value: 'MFE ($)', position: 'insideBottom', offset: -4, fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="y"
                    name="P&L"
                    type="number"
                    tickFormatter={money}
                    tick={{ fontSize: 11 }}
                    label={{ value: 'P&L ($)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  />
                  <ReferenceLine stroke="#6b7280" strokeDasharray="4 4" segment={[{ x: 0, y: 0 }, { x: 10000, y: 10000 }]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="bg-background border rounded-lg shadow p-2 text-xs">
                          <p className="font-medium">{d.name}</p>
                          <p>MFE: {money(d.x)}</p>
                          <p>P&L: {money(d.y)}</p>
                          <p>Efficiency: {pct(d.efficiency)}</p>
                        </div>
                      )
                    }}
                  />
                  <Scatter data={efficiencyData} fill="#8b5cf6" fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
