"use client"

import { cn } from "@/lib/utils"
import type { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard"
import {
  CHART_LOSS,
  CHART_WIN,
  filterBarOpacity,
  unsignedFill,
} from "./chart-glance"

export interface UnitHistogramBucket {
  key: string
  label: string
  count: number
  signed?: number
}

export function canDrawUnitHistogram(counts: number[]) {
  if (counts.length === 0) return false
  const total = counts.reduce((sum, count) => sum + count, 0)
  const peak = Math.max(0, ...counts)
  return counts.length <= 16 && peak <= 24 && total <= 150
}

function bucketFill(signed: number) {
  if (signed > 0) return CHART_WIN
  if (signed < 0) return CHART_LOSS
  return unsignedFill()
}

export function UnitHistogram({
  buckets,
  size = "medium",
  activeKey,
  hasFilter = false,
  onSelect,
  label,
}: {
  buckets: UnitHistogramBucket[]
  size?: WidgetSize
  activeKey?: string | null
  hasFilter?: boolean
  onSelect?: (key: string) => void
  label: string
}) {
  const compact = size === "small"
  const peak = Math.max(1, ...buckets.map((bucket) => bucket.count))

  return (
    <div
      role="img"
      aria-label={label}
      className="flex h-full min-h-0 items-stretch justify-center gap-1 overflow-hidden px-1"
    >
      {buckets.map((bucket) => {
        const signed =
          bucket.signed ?? Number.parseInt(bucket.key.replace("+", ""), 10)
        const color = bucketFill(Number.isFinite(signed) ? signed : 0)
        const blanks = Math.max(0, peak - bucket.count)

        return (
          <button
            key={bucket.key}
            type="button"
            title={`${bucket.label}: ${bucket.count}`}
            onClick={() => onSelect?.(bucket.key)}
            className="flex h-full min-w-0 flex-1 flex-col items-center gap-1"
          >
            <div
              className="grid min-h-0 w-full flex-1 gap-px"
              style={{ gridTemplateRows: `repeat(${peak}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: blanks }, (_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {Array.from({ length: bucket.count }, (_, i) => (
                <span
                  key={`dot-${i}`}
                  className="mx-auto w-[70%] max-w-3 rounded-[1px]"
                  style={{
                    backgroundColor: color,
                    opacity: filterBarOpacity(
                      activeKey === bucket.key,
                      hasFilter,
                    ),
                  }}
                />
              ))}
            </div>
            <span
              className={cn(
                "shrink-0 text-center font-semibold text-foreground",
                compact ? "text-[9px]" : "text-[11px]",
              )}
            >
              {bucket.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
