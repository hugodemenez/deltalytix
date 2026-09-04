"use client"

import { Rectangle } from "recharts"
import { chartBarRadius } from "./chart-glance"

interface GlanceBarProps {
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
  value?: number | string
}

export function GlanceBar({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill,
  value,
}: GlanceBarProps) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0)

  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      radius={chartBarRadius(Number.isFinite(numeric) ? numeric : 0)}
    />
  )
}
