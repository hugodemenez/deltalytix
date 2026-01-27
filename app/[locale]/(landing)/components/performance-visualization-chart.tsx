'use client'

import { useMemo } from "react"

type PnlPoint = {
  day: string
  pnl: number
  contracts: number
}

export function PerformanceVisualizationChart() {
  const data = useMemo<PnlPoint[]>(() => ([
    { day: "Mon", pnl: 520, contracts: 3 },
    { day: "Tue", pnl: -180, contracts: 2 },
    { day: "Wed", pnl: 340, contracts: 2 },
    { day: "Thu", pnl: 80, contracts: 1 },
    { day: "Fri", pnl: 610, contracts: 4 },
    { day: "Mon", pnl: -60, contracts: 1 },
    { day: "Tue", pnl: 290, contracts: 2 },
    { day: "Wed", pnl: 420, contracts: 3 },
    { day: "Thu", pnl: -140, contracts: 2 },
    { day: "Fri", pnl: 510, contracts: 3 }
  ]), [])

  const normalized = useMemo(() => {
    return data.map(d => ({
      ...d,
      perContract: d.contracts ? d.pnl / d.contracts : 0
    }))
  }, [data])

  const maxAbs = useMemo(() => {
    return Math.max(
      100,
      ...normalized.map(d => Math.abs(d.perContract))
    )
  }, [normalized])

  const chartHeight = 240
  const chartWidth = normalized.length * 48
  const mid = chartHeight / 2

  return (
    <div className="h-full w-full rounded-xl border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            PnL / contract
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            Contracts
          </span>
        </div>
        <span className="text-xs">Mock data</span>
      </div>

      <div className="w-full h-[280px]">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full w-full">
          {/* Baseline */}
          <line x1={0} x2={chartWidth} y1={mid} y2={mid} className="stroke-border" strokeWidth={1} />

          {/* Bars for per-contract PnL */}
          {normalized.map((point, idx) => {
            const x = idx * 48 + 16
            const barHeight = (Math.abs(point.perContract) / maxAbs) * (chartHeight / 2 - 20)
            const isPositive = point.perContract >= 0
            const y = isPositive ? mid - barHeight : mid

            return (
              <rect
                key={`${point.day}-${idx}-pnl`}
                x={x}
                y={y}
                width={18}
                height={barHeight}
                rx={4}
                className={isPositive ? "fill-emerald-500/80" : "fill-rose-500/80"}
              />
            )
          })}

          {/* Line for contracts */}
          {normalized.map((point, idx) => {
            const x = idx * 48 + 25
            const y = mid - ((point.contracts / 4) * (chartHeight / 2 - 30))
            return (
              <circle
                key={`${point.day}-${idx}-dot`}
                cx={x}
                cy={y}
                r={4}
                className="fill-sky-500"
              />
            )
          })}

          <path
            d={normalized.map((point, idx) => {
              const x = idx * 48 + 25
              const y = mid - ((point.contracts / 4) * (chartHeight / 2 - 30))
              return `${idx === 0 ? "M" : "L"} ${x} ${y}`
            }).join(" ")}
            className="stroke-sky-500"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Day labels */}
          {normalized.map((point, idx) => {
            const x = idx * 48 + 25
            return (
              <text
                key={`${point.day}-${idx}-label`}
                x={x}
                y={chartHeight - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {point.day}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}