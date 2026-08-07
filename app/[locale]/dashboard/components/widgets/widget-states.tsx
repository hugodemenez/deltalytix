"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { WidgetSize } from "../../types/dashboard"
import { widgetPadding, widgetType } from "./widget-type"

/**
 * Nothing to show yet. One line saying what would appear here and what to do
 * about it. No illustration, no card inside the card, no oversized icon.
 */
export function WidgetEmpty({
  message,
  action,
  size = "medium",
  className,
}: {
  message: React.ReactNode
  action?: React.ReactNode
  size?: WidgetSize
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col items-center justify-center gap-2 text-center",
        widgetPadding(size),
        className,
      )}
    >
      <p className={cn(widgetType.label, "max-w-[36ch] text-balance")}>{message}</p>
      {action}
    </div>
  )
}

/**
 * Something failed. State what, in one sentence, and offer the retry if one
 * exists. Uses the destructive token for the state, plus words — never color
 * alone.
 */
export function WidgetError({
  message,
  onRetry,
  retryLabel = "Retry",
  size = "medium",
  className,
}: {
  message: React.ReactNode
  onRetry?: () => void
  retryLabel?: string
  size?: WidgetSize
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex h-full min-h-0 flex-col items-center justify-center gap-2 text-center",
        widgetPadding(size),
        className,
      )}
    >
      <p className={cn("text-xs text-destructive", "max-w-[36ch] text-balance")}>
        {message}
      </p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}

/**
 * A skeleton that matches the geometry of the thing it replaces, so nothing
 * jumps when data arrives. Static under `prefers-reduced-motion`.
 */
export function WidgetSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-md bg-muted motion-safe:animate-pulse",
        className,
      )}
      {...props}
    />
  )
}

/** Skeleton shaped like a label/value list. */
export function WidgetStatListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-3">
          <WidgetSkeleton className="h-3 w-24" />
          <WidgetSkeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

/** Skeleton shaped like a plotted frame: axis gutter plus plot area. */
export function WidgetChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full min-h-0 w-full gap-2", className)}>
      <div className="flex w-10 shrink-0 flex-col justify-between py-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <WidgetSkeleton key={index} className="h-2 w-full" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 items-end gap-2 pb-5">
        {[0.45, 0.7, 0.35, 0.85, 0.6, 0.5, 0.75].map((height, index) => (
          <WidgetSkeleton
            key={index}
            className="min-w-0 flex-1"
            style={{ height: `${height * 100}%` }}
          />
        ))}
      </div>
    </div>
  )
}
