"use client"

import { Rectangle } from "recharts"
import {
  CHART_BAR_CAP,
  type ChartBarLayout,
  chartBarRadius,
  normalizeBarRect,
} from "./chart-glance"

interface GlanceBarProps {
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
  value?: number | string
  layout?: ChartBarLayout
}

export function GlanceBar({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill,
  value,
  layout = "vertical",
}: GlanceBarProps) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0)
  const signed =
    Number.isFinite(numeric) && numeric !== 0
      ? numeric
      : layout === "horizontal"
        ? width
        : height
  const rect = normalizeBarRect(x, y, width, height)
  const cap = Math.min(CHART_BAR_CAP, rect.width / 2, rect.height / 2)

  return (
    <Rectangle
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      fill={fill}
      radius={chartBarRadius(signed, layout).map((corner) =>
        corner === 0 ? 0 : cap,
      ) as [number, number, number, number]}
    />
  )
}
