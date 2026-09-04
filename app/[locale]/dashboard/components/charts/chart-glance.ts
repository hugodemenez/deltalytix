import type { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard"

/**
 * Glance-family defaults for dashboard chart widgets.
 *
 * Mapped from lieflat-charts catalog shapes (dashboard context → Glance):
 * daily / weekday / hour / side / instrument P&L → G10 diverging bars
 * equity → G18 draw-in + counter
 * tick histogram → F1 rung bars (bins as categories)
 * win/loss/BE and P/L-vs-fees → F4 tick donut
 *
 * Visual rules stay on Paper tokens. Length still encodes value, axes stay
 * unbroken, fills stay solid, and bar caps round on the outer end.
 */

export const CHART_WIN = "hsl(var(--chart-win))"
export const CHART_LOSS = "hsl(var(--chart-loss))"
export const CHART_LINE_STROKE = 2
export const CHART_BAR_CAP = 8
export const CHART_TOOLTIP_CLASS = "rounded-lg border bg-background p-2"
export const CHART_TOOLTIP_WRAPPER = { zIndex: 1000 } as const

export const CHART_GRID_PROPS = {
  vertical: false,
  stroke: "hsl(var(--border))",
  strokeOpacity: 0.45,
} as const

export const CHART_ZERO_LINE_PROPS = {
  stroke: "hsl(var(--muted-foreground))",
  strokeOpacity: 0.45,
} as const

export function chartMaxBarSize(size: WidgetSize = "medium") {
  return size === "small" ? 28 : 52
}

export function chartBarRadius(
  value: number,
): [number, number, number, number] {
  return value >= 0
    ? [CHART_BAR_CAP, CHART_BAR_CAP, 0, 0]
    : [0, 0, CHART_BAR_CAP, CHART_BAR_CAP]
}

export function chartTickStyle(size: WidgetSize = "medium") {
  return {
    fontSize: size === "small" ? 9 : 11,
    fill: "currentColor",
    fontWeight: 600,
  }
}

export function chartTooltipFontSize(size: WidgetSize = "medium") {
  return size === "small" ? "10px" : "12px"
}

export function signedFill(value: number) {
  if (value > 0) return CHART_WIN
  if (value < 0) return CHART_LOSS
  return "hsl(var(--muted-foreground))"
}

export function unsignedFill() {
  return "hsl(var(--chart-2))"
}

export function filterBarOpacity(isActive: boolean, hasFilter: boolean) {
  if (!hasFilter) return 1
  return isActive ? 1 : 0.35
}

export function honestSignedDomain(values: number[]): [number, number] {
  if (values.length === 0) {
    return [0, 0]
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max(Math.abs(min), Math.abs(max)) * 0.1
  return [Math.min(min - pad, 0), Math.max(max + pad, 0)]
}

export function honestPositiveDomain(values: number[]): [number, number] {
  if (values.length === 0) {
    return [0, 1]
  }

  const max = Math.max(0, ...values)
  return [0, max === 0 ? 1 : max * 1.1]
}

export function peakIndex<T>(
  items: T[],
  valueOf: (item: T) => number,
  prefer: "max" | "min" = "max",
) {
  if (items.length === 0) return -1
  let best = 0
  for (let i = 1; i < items.length; i++) {
    const current = valueOf(items[i])
    const winner = valueOf(items[best])
    if (prefer === "max" ? current > winner : current < winner) {
      best = i
    }
  }
  return best
}
