"use client"

import { cn } from "@/lib/utils"
import type { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard"
import type { UnitFieldGroup } from "./chart-unit-field"

export interface ShareSplitPart extends UnitFieldGroup {
  percent: number
}

export function sharePercents(groups: UnitFieldGroup[]): ShareSplitPart[] {
  const total = groups.reduce((sum, group) => sum + Math.max(0, group.count), 0)
  if (total <= 0) {
    return groups.map((group) => ({ ...group, percent: 0 }))
  }

  const raw = groups.map((group) => ({
    group,
    exact: (Math.max(0, group.count) / total) * 100,
  }))
  const percents = raw.map((row) => Math.floor(row.exact))
  let remaining = 100 - percents.reduce((sum, value) => sum + value, 0)
  const order = raw
    .map((row, index) => ({
      index,
      frac: row.exact - Math.floor(row.exact),
      count: row.group.count,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.frac - a.frac)

  for (let i = 0; i < remaining && order.length > 0; i++) {
    percents[order[i % order.length].index] += 1
  }

  return groups.map((group, index) => ({ ...group, percent: percents[index] }))
}

export function ShareSplit({
  groups,
  headline,
  caption,
  label,
  size = "medium",
}: {
  groups: UnitFieldGroup[]
  headline: string
  caption: string
  label: string
  size?: WidgetSize
}) {
  const compact = size === "small" || size === "tiny"
  const parts = sharePercents(groups).filter((part) => part.percent > 0)

  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-center gap-5">
      <div className="min-w-0">
        <p
          className={cn(
            "font-semibold tracking-[-0.04em] tabular-nums text-foreground",
            compact ? "text-3xl" : "text-5xl",
          )}
        >
          {headline}
        </p>
        <p
          className={cn(
            "mt-1 text-muted-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {caption}
        </p>
      </div>
      <div
        role="img"
        aria-label={label}
        className={cn(
          "flex w-full overflow-hidden rounded-full bg-muted",
          compact ? "h-2.5" : "h-3",
        )}
      >
        {parts.map((part) => (
          <span
            key={part.key}
            title={`${part.label} · ${part.percent}%`}
            className="min-w-0"
            style={{
              flexGrow: part.percent,
              backgroundColor: part.color,
            }}
          />
        ))}
      </div>
      <ul
        className={cn(
          "flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground",
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
