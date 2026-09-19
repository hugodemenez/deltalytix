"use client"

import { normalizeBarRect } from "./chart-glance"

interface LollipopBarProps {
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
  value?: number | string
}

export function LollipopBar({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill,
  value,
}: LollipopBarProps) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0)
  const rect = normalizeBarRect(x, y, width, height)
  if (rect.height === 0 || rect.width === 0) {
    return null
  }

  const negative = (Number.isFinite(numeric) ? numeric : height) < 0
  const cx = rect.x + rect.width / 2
  const tipY = negative ? rect.y + rect.height : rect.y
  const baseY = negative ? rect.y : rect.y + rect.height
  const radius = Math.min(4.5, Math.max(2.5, rect.width / 3))

  return (
    <g>
      <line
        x1={cx}
        y1={baseY}
        x2={cx}
        y2={tipY}
        stroke={fill}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={tipY} r={radius} fill={fill} />
    </g>
  )
}
