"use client"

import * as React from "react"
import { CartesianGrid, ReferenceLine } from "recharts"

import { cn } from "@/lib/utils"
import { WidgetSize } from "../../types/dashboard"
import { chartTickFontSize, isCompactSize, widgetType } from "./widget-type"

/**
 * Shared Recharts furniture, so every chart in the dashboard reads as one
 * system: quiet axes, horizontal-only grid, honest zero baselines, direct
 * labels over legends, and colors read from CSS variables so the theme swap is
 * automatic in both directions.
 */

/** Grid, ticks, and axis lines all resolve from theme tokens. */
export const chartColors = {
  grid: "hsl(var(--border))",
  tick: "hsl(var(--muted-foreground))",
  axis: "hsl(var(--border))",
  baseline: "hsl(var(--muted-foreground))",
  foreground: "hsl(var(--foreground))",
  /** Neutral magnitude fill. The default for any bar that is not signed. */
  neutral: "hsl(var(--muted-foreground))",
  win: "hsl(var(--chart-win))",
  loss: "hsl(var(--chart-loss))",
  primary: "hsl(var(--primary))",
} as const

/** Categorical series colors, in the order they must be used. */
export const categoricalSeries = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
] as const

export function seriesColor(index: number): string {
  return categoricalSeries[index % categoricalSeries.length]
}

/**
 * Axis props every chart spreads. No axis line, no tick line — the grid already
 * carries the scale, and a second rule is noise.
 */
export function axisProps(size: WidgetSize) {
  return {
    tickLine: false as const,
    axisLine: false as const,
    tick: { fontSize: chartTickFontSize(size), fill: chartColors.tick },
    tickMargin: isCompactSize(size) ? 4 : 8,
  }
}

/** Plot margins matched to the widget's padding scale. */
export function chartMargin(size: WidgetSize) {
  return isCompactSize(size)
    ? { top: 4, right: 4, bottom: 4, left: 0 }
    : { top: 8, right: 8, bottom: 8, left: 0 }
}

/**
 * Horizontal-only grid. Vertical grid lines add no information to a categorical
 * or time axis and compete with the marks.
 */
export function WidgetChartGrid({ vertical = false }: { vertical?: boolean }) {
  return (
    <CartesianGrid
      strokeDasharray="3 3"
      stroke={chartColors.grid}
      vertical={vertical}
      horizontal
    />
  )
}

/**
 * The zero baseline. Any chart that plots signed values must draw it, so a
 * small loss is never read as a small gain.
 */
export function WidgetZeroLine({ y = 0 }: { y?: number }) {
  return (
    <ReferenceLine
      y={y}
      stroke={chartColors.baseline}
      strokeOpacity={0.4}
      strokeWidth={1}
    />
  )
}

export interface WidgetTooltipRow {
  label: React.ReactNode
  value: React.ReactNode
  /** Optional swatch color, for multi-series charts only. */
  color?: string
  /** Optional tone class applied to the value. */
  toneClassName?: string
}

/**
 * The one tooltip shape for the dashboard: sentence-case labels on the left,
 * right-aligned tabular values, no uppercase eyebrows, no nested panels.
 */
export function WidgetTooltip({
  title,
  rows,
  caption,
  className,
}: {
  title?: React.ReactNode
  rows: WidgetTooltipRow[]
  caption?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "min-w-[9rem] rounded-md border bg-popover px-2.5 py-2 text-popover-foreground shadow-md",
        className,
      )}
    >
      {title ? (
        <div className={cn(widgetType.section, "mb-1.5")}>{title}</div>
      ) : null}
      <div className="flex flex-col gap-1">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-1.5">
              {row.color ? (
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: row.color }}
                />
              ) : null}
              <span className={cn(widgetType.label, "truncate")}>{row.label}</span>
            </div>
            <span
              className={cn(
                widgetType.value,
                "shrink-0 text-right",
                row.toneClassName,
              )}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
      {caption ? (
        <div className={cn(widgetType.caption, "mt-1.5")}>{caption}</div>
      ) : null}
    </div>
  )
}

/**
 * Direct labels beat legends. Use this only when a chart carries three or more
 * series and direct labelling genuinely does not fit.
 */
export function WidgetChartLegend({
  items,
  className,
}: {
  items: { label: React.ReactNode; color: string }[]
  className?: string
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
      {items.map((item, index) => (
        <li key={index} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: item.color }}
          />
          <span className={widgetType.label}>{item.label}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Wraps a chart whose marks are clickable (click-to-filter). Gives the region a
 * real accessible name, keyboard operation, and a visible focus ring, so the
 * interaction is not mouse-only.
 */
export function WidgetChartInteractive({
  onActivate,
  label,
  className,
  children,
}: {
  onActivate: () => void
  /** States the effect, e.g. "Filter trades by the hovered weekday". */
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onActivate()
        }
      }}
      className={cn(
        "h-full w-full cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        className,
      )}
    >
      {children}
    </div>
  )
}
