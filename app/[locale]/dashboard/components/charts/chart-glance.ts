import type { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard"

/**
 * Chart encodings for dashboard widgets, mapped from lieflat-charts
 * data shapes. Implementations are original React/SVG on Paper tokens.
 *
 * trade / commission share → L14 / G4 unit field (one dot = one trade or 1%)
 * daily P/L sequence → L3 barcode lollipop (stem = day, cap = net)
 * weekday / side → G10 / F5 horizontal diverging bars
 * tick histogram → F1 countable stacks (one dot = one trade)
 * hourly / instrument P/L → G10 vertical diverging bars
 * equity → G18 counter + line
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

export const CHART_GRID_PROPS_HORIZONTAL = {
  horizontal: false,
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

export type ChartBarLayout = "vertical" | "horizontal"

export function normalizeBarRect(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  return {
    x: width < 0 ? x + width : x,
    y: height < 0 ? y + height : y,
    width: Math.abs(width),
    height: Math.abs(height),
  }
}

export function chartBarRadius(
  value: number,
  layout: ChartBarLayout = "vertical",
): [number, number, number, number] {
  const negative = value < 0
  if (layout === "horizontal") {
    return negative
      ? [CHART_BAR_CAP, 0, 0, CHART_BAR_CAP]
      : [0, CHART_BAR_CAP, CHART_BAR_CAP, 0]
  }
  return negative
    ? [0, 0, CHART_BAR_CAP, CHART_BAR_CAP]
    : [CHART_BAR_CAP, CHART_BAR_CAP, 0, 0]
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
