'use client'

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"

type TradeLike = {
  instrument?: string
  pnl: number
  commission?: number
  quantity: number
}

type ChartEntry = {
  instrument: string
  averagePnl: number
}

function formatCurrency(value: number) {
  if (!isFinite(value) || isNaN(value)) {
    return '$0'
  }

  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${value < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${value < 0 ? '-' : ''}$${(abs / 1_000).toFixed(1)}k`
  return `${value < 0 ? '-' : ''}$${abs.toFixed(0)}`
}

function aggregateTrades(trades: TradeLike[]): ChartEntry[] {
  const groups: Record<string, { totalPnl: number; totalContracts: number }> = {}

  trades.forEach((trade) => {
    const instrument = trade.instrument || 'Unknown'
    const netPnl = (isFinite(trade.pnl) ? trade.pnl : 0) - (isFinite(trade.commission || 0) ? (trade.commission || 0) : 0)
    const quantity = isFinite(trade.quantity) ? trade.quantity : 0

    if (!groups[instrument]) {
      groups[instrument] = { totalPnl: 0, totalContracts: 0 }
    }
    groups[instrument].totalPnl += netPnl
    groups[instrument].totalContracts += quantity
  })

  return Object.entries(groups)
    .map(([instrument, data]) => ({
      instrument,
      averagePnl: data.totalContracts > 0 ? data.totalPnl / data.totalContracts : 0,
    }))
    .sort((a, b) => b.averagePnl - a.averagePnl)
}

function getBarColor(value: number, absMax: number) {
  if (!isFinite(value) || isNaN(value)) {
    return 'hsl(var(--chart-win) / 0.2)'
  }

  const ratio = absMax === 0 ? 0.2 : Math.max(0.2, Math.abs(value / absMax))
  const base = value >= 0 ? '--chart-win' : '--chart-loss'
  return `hsl(var(${base}) / ${ratio})`
}

function LandingPnlBarChart({ chartData }: { chartData: ChartEntry[] }) {
  const t = useI18n()

  const absMax = useMemo(() => {
    const values = chartData.map((d) => d.averagePnl)
    return Math.max(Math.abs(Math.max(0, ...values)), Math.abs(Math.min(0, ...values)), 1)
  }, [chartData])

  const xTicks = useMemo(() => {
    const domainMax = absMax * 1.1
    const domainMin = -absMax * 1.1
    const tickCount = 5
    return Array.from({ length: tickCount }, (_, i) => {
      return domainMin + ((domainMax - domainMin) * i) / (tickCount - 1)
    })
  }, [absMax])

  return (
    <Card className="h-[500px] flex flex-col border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-[56px]">
        <CardTitle className="line-clamp-1 text-base">{t('embed.pnlPerContract.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-2 sm:p-4">
        <div className="flex h-full flex-col">
          <div className="relative flex min-h-0 flex-1 flex-col justify-center gap-2 py-2">
            {chartData.map((entry) => {
              const widthPct = (Math.abs(entry.averagePnl) / (absMax * 1.1)) * 50
              const isPositive = entry.averagePnl >= 0

              return (
                <div key={entry.instrument} className="grid grid-cols-[36px_1fr] items-center gap-2">
                  <span className="truncate text-right text-[11px] font-medium text-muted-foreground">
                    {entry.instrument}
                  </span>
                  <div className="relative h-6 rounded-sm bg-muted/30">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                    <div
                      className={cn(
                        "absolute top-1/2 h-[70%] -translate-y-1/2 rounded-[3px] transition-all duration-300",
                        isPositive ? "left-1/2 rounded-l-none" : "right-1/2 rounded-r-none"
                      )}
                      style={{
                        width: `${Math.max(widthPct, entry.averagePnl !== 0 ? 2 : 0)}%`,
                        backgroundColor: getBarColor(entry.averagePnl, absMax),
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="relative mt-1 grid grid-cols-[36px_1fr] gap-2">
            <div />
            <div className="relative h-5">
              {xTicks.map((tick) => {
                const position = ((tick + absMax * 1.1) / (absMax * 2.2)) * 100
                return (
                  <span
                    key={tick}
                    className="absolute -translate-x-1/2 text-[10px] text-muted-foreground"
                    style={{ left: `${position}%` }}
                  >
                    {formatCurrency(tick)}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PnlPerContractPreview() {
  const trades = useMemo(
    () => [
      { instrument: "ES", pnl: 820, commission: 14, quantity: 6 },
      { instrument: "ES", pnl: -260, commission: 8, quantity: 4 },
      { instrument: "NQ", pnl: 540, commission: 10, quantity: 5 },
      { instrument: "NQ", pnl: 110, commission: 6, quantity: 2 },
      { instrument: "CL", pnl: -180, commission: 5, quantity: 3 },
      { instrument: "CL", pnl: 320, commission: 5, quantity: 3 },
      { instrument: "GC", pnl: 210, commission: 4, quantity: 2 },
      { instrument: "GC", pnl: -90, commission: 3, quantity: 1 },
      { instrument: "YM", pnl: 430, commission: 7, quantity: 4 },
      { instrument: "YM", pnl: -70, commission: 3, quantity: 2 },
      { instrument: "RTY", pnl: 260, commission: 6, quantity: 3 },
      { instrument: "RTY", pnl: -120, commission: 4, quantity: 2 },
      { instrument: "6E", pnl: 140, commission: 3, quantity: 2 },
      { instrument: "6E", pnl: -60, commission: 2, quantity: 1 },
      { instrument: "ZN", pnl: 90, commission: 2, quantity: 2 },
      { instrument: "ZN", pnl: -40, commission: 2, quantity: 1 },
    ],
    []
  )

  const chartData = useMemo(() => aggregateTrades(trades), [trades])

  return (
    <div className="h-full w-full rounded-xl border bg-card shadow-sm pointer-events-none">
      <LandingPnlBarChart chartData={chartData} />
    </div>
  )
}
