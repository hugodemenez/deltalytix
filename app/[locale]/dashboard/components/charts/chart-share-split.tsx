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
  const parts = sharePercents(groups)
  const trackParts = parts.filter((part) => part.percent > 0)

  return (
    <div className="grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] gap-3">
      <div className="min-w-0">
        <p
          className={cn(
            "font-semibold tracking-[-0.04em] tabular-nums text-foreground",
            compact ? "text-3xl" : "text-4xl",
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
        <div
          role="img"
          aria-label={label}
          className={cn(
            "mt-3 flex w-full overflow-hidden rounded-full bg-muted",
            compact ? "h-2" : "h-2.5",
          )}
        >
          {trackParts.map((part) => (
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
      </div>
      <div
        className="grid min-h-0 gap-2"
        style={{
          gridTemplateRows: `repeat(${Math.max(parts.length, 1)}, minmax(0, 1fr))`,
        }}
      >
        {parts.map((part) => (
          <div
            key={part.key}
            className={cn(
              "flex min-h-0 min-w-0 flex-col rounded-lg bg-muted/40",
              compact ? "gap-1 px-2.5 py-1.5" : "gap-1.5 px-3 py-2",
            )}
          >
            <div className="flex shrink-0 items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: part.color }}
                />
                <span
                  className={cn(
                    "truncate",
                    compact ? "text-[11px]" : "text-sm",
                  )}
                >
                  {part.label}
                </span>
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                {part.detail ? (
                  <span
                    className={cn(
                      "tabular-nums text-muted-foreground",
                      compact ? "text-[10px]" : "text-xs",
                    )}
                  >
                    {part.detail}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "font-semibold tabular-nums text-foreground",
                    compact ? "text-sm" : "text-base",
                  )}
                >
                  {part.percent}%
                </span>
              </span>
            </div>
            <div className="min-h-2 w-full flex-1 overflow-hidden rounded-md bg-muted">
              <span
                className="block h-full rounded-md"
                style={{
                  width: `${part.percent}%`,
                  backgroundColor: part.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
