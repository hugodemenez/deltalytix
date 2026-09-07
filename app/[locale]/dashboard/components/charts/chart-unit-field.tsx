"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard"

export const UNIT_FIELD_RECORD_LIMIT = 120
export const UNIT_FIELD_PERCENT_DOTS = 100

export interface UnitFieldGroup {
  key: string
  label: string
  color: string
  count: number
}

export interface UnitDot {
  key: string
  color: string
  label: string
}

export function expandUnitDots(
  groups: UnitFieldGroup[],
  mode: "record" | "percent",
): UnitDot[] {
  if (mode === "percent") {
    const total = groups.reduce((sum, group) => sum + group.count, 0)
    if (total <= 0) return []

    const raw = groups.map((group) => ({
      group,
      exact: (group.count / total) * UNIT_FIELD_PERCENT_DOTS,
    }))
    const dots = raw.map((row) => Math.floor(row.exact))
    let remaining =
      UNIT_FIELD_PERCENT_DOTS - dots.reduce((sum, value) => sum + value, 0)
    const order = raw
      .map((row, index) => ({ index, frac: row.exact - Math.floor(row.exact) }))
      .sort((a, b) => b.frac - a.frac)

    for (let i = 0; i < remaining; i++) {
      dots[order[i % order.length].index] += 1
    }

    return dots.flatMap((count, index) =>
      Array.from({ length: Math.max(0, count) }, (_, i) => ({
        key: `${raw[index].group.key}-${i}`,
        color: raw[index].group.color,
        label: raw[index].group.label,
      })),
    )
  }

  return groups.flatMap((group) =>
    Array.from({ length: Math.max(0, Math.round(group.count)) }, (_, i) => ({
      key: `${group.key}-${i}`,
      color: group.color,
      label: group.label,
    })),
  )
}

export function shouldPackUnitField(total: number) {
  return total > UNIT_FIELD_RECORD_LIMIT
}

export function pickUnitFieldGrid(
  width: number,
  height: number,
  count = UNIT_FIELD_PERCENT_DOTS,
): { columns: number; rows: number } {
  const safeCount = Math.max(1, count)
  if (width <= 0 || height <= 0) {
    return { columns: 10, rows: Math.ceil(safeCount / 10) }
  }

  const ratio = width / height
  const columns = Math.min(
    20,
    Math.max(4, Math.round(Math.sqrt(safeCount * ratio))),
  )
  return { columns, rows: Math.ceil(safeCount / columns) }
}

function useFilledUnitGrid(count: number) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [grid, setGrid] = React.useState({
    columns: 10,
    rows: Math.ceil(Math.max(count, 1) / 10),
  })

  React.useLayoutEffect(() => {
    const node = ref.current
    if (!node) return

    const update = () => {
      const width = node.clientWidth
      const height = node.clientHeight
      if (width < 8 || height < 8) return
      const next = pickUnitFieldGrid(width, height, count)
      setGrid((current) =>
        current.columns === next.columns && current.rows === next.rows
          ? current
          : next,
      )
    }

    update()
    const frame = window.requestAnimationFrame(update)
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [count])

  return { ref, ...grid }
}

export function UnitFieldGrid({
  dots,
  columns,
  rows,
  size = "medium",
  label,
}: {
  dots: Array<{ key: string; color: string; label?: string }>
  columns: number
  rows: number
  size?: WidgetSize
  label?: string
}) {
  const compact = size === "small" || size === "tiny"

  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      className={cn("grid h-full min-h-0 w-full", compact ? "gap-1" : "gap-1.5")}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {dots.map((dot) => (
        <span
          key={dot.key}
          title={dot.label}
          className="min-h-0 min-w-0 rounded-full"
          style={{ backgroundColor: dot.color }}
        />
      ))}
    </div>
  )
}

export function UnitDotField({
  groups,
  mode = "percent",
  label,
  size = "medium",
}: {
  groups: UnitFieldGroup[]
  mode?: "record" | "percent"
  label: string
  size?: WidgetSize
}) {
  const dots = expandUnitDots(groups, mode)
  const compact = size === "small" || size === "tiny"
  const { ref, columns, rows } = useFilledUnitGrid(
    dots.length || UNIT_FIELD_PERCENT_DOTS,
  )

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <div ref={ref} className="min-h-0 min-w-0 w-full flex-1">
        <UnitFieldGrid
          dots={dots}
          columns={columns}
          rows={rows}
          size={size}
          label={label}
        />
      </div>
      <ul
        className={cn(
          "flex shrink-0 flex-wrap justify-center gap-x-3 gap-y-1 text-muted-foreground",
          compact ? "text-[10px]" : "text-[11px]",
        )}
      >
        {groups
          .filter((group) => group.count > 0)
          .map((group) => (
            <li key={group.key} className="flex items-center gap-1.5">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <span className="leading-none">{group.label}</span>
            </li>
          ))}
      </ul>
    </div>
  )
}
