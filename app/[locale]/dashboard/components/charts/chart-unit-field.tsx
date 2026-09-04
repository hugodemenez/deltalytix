"use client"

import { cn } from "@/lib/utils"
import type { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard"

export const UNIT_FIELD_RECORD_LIMIT = 120

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
      exact: (group.count / total) * 100,
    }))
    const dots = raw.map((row) => Math.floor(row.exact))
    let remaining = 100 - dots.reduce((sum, value) => sum + value, 0)
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

export function UnitDotField({
  groups,
  mode = "record",
  label,
  size = "medium",
}: {
  groups: UnitFieldGroup[]
  mode?: "record" | "percent"
  label: string
  size?: WidgetSize
}) {
  const dots = expandUnitDots(groups, mode)
  const compact = size === "small"
  const columns = mode === "percent" || dots.length > 40 ? 10 : 8

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div
        role="img"
        aria-label={label}
        className="grid min-h-0 flex-1 content-center justify-center gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${columns}, ${compact ? "0.55rem" : "0.7rem"})`,
        }}
      >
        {dots.map((dot) => (
          <span
            key={dot.key}
            title={dot.label}
            className={cn("rounded-full", compact ? "size-2" : "size-2.5")}
            style={{ backgroundColor: dot.color }}
          />
        ))}
      </div>
      <ul
        className={cn(
          "flex flex-wrap justify-center gap-x-3 gap-y-1 text-muted-foreground",
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
