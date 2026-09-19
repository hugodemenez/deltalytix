import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export const CHART_WIDGET_KINDS = [
  "series",
  "share",
  "category",
  "duration",
  "ticks",
  "metric",
] as const

export type ChartWidgetKind = (typeof CHART_WIDGET_KINDS)[number]

function KindSvg({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  )
}

function SeriesKindIcon({ className }: { className?: string }) {
  return (
    <KindSvg className={className}>
      <path
        d="M4 13.5V8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="4" cy="6.5" r="1.5" fill="currentColor" />
      <path
        d="M8 13.5V6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8" cy="4.5" r="1.5" fill="currentColor" />
      <path
        d="M12 13.5V10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="8.5" r="1.5" fill="currentColor" />
    </KindSvg>
  )
}

function ShareKindIcon({ className }: { className?: string }) {
  return (
    <KindSvg className={className}>
      <rect x="3" y="4" width="10" height="3.2" rx="1.2" fill="currentColor" />
      <rect
        x="3"
        y="8.6"
        width="10"
        height="3.2"
        rx="1.2"
        fill="currentColor"
        opacity="0.4"
      />
    </KindSvg>
  )
}

function CategoryKindIcon({ className }: { className?: string }) {
  return (
    <KindSvg className={className}>
      <path
        d="M8 3.5V12.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.35"
      />
      <rect x="3" y="4.4" width="5" height="2.2" rx="1.1" fill="currentColor" />
      <rect x="8" y="9.4" width="5" height="2.2" rx="1.1" fill="currentColor" />
    </KindSvg>
  )
}

function DurationKindIcon({ className }: { className?: string }) {
  return (
    <KindSvg className={className}>
      <rect x="3" y="8" width="2.5" height="5" rx="1.2" fill="currentColor" />
      <rect x="6.75" y="4.5" width="2.5" height="8.5" rx="1.2" fill="currentColor" />
      <rect x="10.5" y="6.5" width="2.5" height="6.5" rx="1.2" fill="currentColor" />
    </KindSvg>
  )
}

function TicksKindIcon({ className }: { className?: string }) {
  return (
    <KindSvg className={className}>
      <circle cx="4.5" cy="5" r="1.35" fill="currentColor" />
      <circle cx="8" cy="5" r="1.35" fill="currentColor" />
      <circle cx="11.5" cy="5" r="1.35" fill="currentColor" />
      <circle cx="4.5" cy="11" r="1.35" fill="currentColor" opacity="0.4" />
      <circle cx="8" cy="11" r="1.35" fill="currentColor" />
      <circle cx="11.5" cy="11" r="1.35" fill="currentColor" opacity="0.4" />
    </KindSvg>
  )
}

function MetricKindIcon({ className }: { className?: string }) {
  return (
    <KindSvg className={className}>
      <rect x="3.5" y="4" width="9" height="2.1" rx="1.05" fill="currentColor" />
      <rect
        x="3.5"
        y="7.45"
        width="6.5"
        height="2.1"
        rx="1.05"
        fill="currentColor"
        opacity="0.45"
      />
      <rect
        x="3.5"
        y="10.9"
        width="4.2"
        height="2.1"
        rx="1.05"
        fill="currentColor"
        opacity="0.25"
      />
    </KindSvg>
  )
}

const KIND_ICONS: Record<
  ChartWidgetKind,
  (props: { className?: string }) => JSX.Element
> = {
  series: SeriesKindIcon,
  share: ShareKindIcon,
  category: CategoryKindIcon,
  duration: DurationKindIcon,
  ticks: TicksKindIcon,
  metric: MetricKindIcon,
}

export function ChartWidgetKindMark({
  kind,
  compact = false,
}: {
  kind: ChartWidgetKind
  compact?: boolean
}) {
  const Icon = KIND_ICONS[kind]

  return (
    <span
      aria-hidden
      data-widget-kind={kind}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md bg-foreground/[0.06] text-foreground",
        compact ? "size-6" : "size-7",
      )}
    >
      <Icon className={compact ? "size-3.5" : "size-4"} />
    </span>
  )
}
