"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { InfoBubble } from "@/components/ui/info-bubble"
import { WidgetSize } from "../../types/dashboard"
import {
  isCompactSize,
  widgetHeaderPadding,
  widgetMetricClass,
  widgetPadding,
  widgetType,
} from "./widget-type"

/**
 * A widget is one card. Inside it there are no more cards.
 *
 * `WidgetCard` owns the only border a widget gets for free. Any further border
 * has to be earned by selection, interaction, warning, or real grouping —
 * prefer spacing and alignment first.
 */
export const WidgetCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex h-full min-w-0 flex-col overflow-hidden rounded-lg border bg-card text-card-foreground",
      className,
    )}
    {...props}
  />
))
WidgetCard.displayName = "WidgetCard"

interface WidgetHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  size?: WidgetSize
  /** The widget name. Rendered as a heading. */
  title: React.ReactNode
  /** One sentence explaining what the widget measures. */
  description?: React.ReactNode
  /** Controls that act on this widget. Kept to the right, quiet by default. */
  actions?: React.ReactNode
}

/**
 * Title, optional explanation, optional actions, separated from the body by a
 * single rule. The rule is structural grouping, so it is earned.
 */
export function WidgetHeader({
  size = "medium",
  title,
  description,
  actions,
  className,
  children,
  ...props
}: WidgetHeaderProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 border-b",
        widgetHeaderPadding(size),
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <h3 className={cn(widgetType.title, "min-w-0 truncate")}>{title}</h3>
        {description ? (
          <InfoBubble
            side="top"
            iconClassName={isCompactSize(size) ? "size-3.5" : "size-4"}
          >
            <p>{description}</p>
          </InfoBubble>
        ) : null}
        {children}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      ) : null}
    </div>
  )
}

interface WidgetBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: WidgetSize
  /** Charts fill the frame edge to edge; drop the padding for them. */
  flush?: boolean
}

/**
 * The evidence. Fills the remaining height and may shrink below its content.
 *
 * Forwards its ref: scrolling and virtualized bodies need to measure this
 * element, and a table should not have to wrap it in another div to do so.
 */
export const WidgetBody = React.forwardRef<HTMLDivElement, WidgetBodyProps>(
  ({ size = "medium", flush = false, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "min-h-0 min-w-0 flex-1",
        flush ? "p-0" : widgetPadding(size),
        className,
      )}
      {...props}
    />
  ),
)
WidgetBody.displayName = "WidgetBody"

/** Units, period, population — the qualifiers that make a figure auditable. */
export function WidgetFooter({
  size = "medium",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { size?: WidgetSize }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 border-t",
        widgetType.caption,
        widgetHeaderPadding(size),
        className,
      )}
      {...props}
    />
  )
}

interface WidgetMetricProps {
  /** What the number is. Sentence case, no all-caps eyebrow. */
  label: React.ReactNode
  /** The formatted figure. Format it with `widget-format.ts`, not `toFixed`. */
  value: React.ReactNode
  /** Unit, period, or population. Sits directly under the value. */
  caption?: React.ReactNode
  /** Color the value by P&L tone. Always pair with a sign in the value itself. */
  toneClassName?: string
  size?: WidgetSize
  className?: string
}

/**
 * The single focal figure of a KPI widget: label above, number below, qualifier
 * under that. No icon tile, no badge, no border.
 */
export function WidgetMetric({
  label,
  value,
  caption,
  toneClassName,
  size = "medium",
  className,
}: WidgetMetricProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className={widgetType.label}>{label}</span>
      <span className={cn(widgetMetricClass(size), toneClassName)}>{value}</span>
      {caption ? <span className={widgetType.caption}>{caption}</span> : null}
    </div>
  )
}

interface WidgetStatProps {
  label: React.ReactNode
  value: React.ReactNode
  /** Optional one-sentence explanation, shown as an info affordance. */
  description?: React.ReactNode
  /** Color the value by P&L tone. */
  toneClassName?: string
  className?: string
}

/**
 * A label/value row. The label sits left, the value right, so peers across a
 * widget share one right edge and one precision.
 */
export function WidgetStat({
  label,
  value,
  description,
  toneClassName,
  className,
}: WidgetStatProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-1">
        <span className={cn(widgetType.label, "truncate")}>{label}</span>
        {description ? (
          <InfoBubble iconClassName="size-3">
            <p>{description}</p>
          </InfoBubble>
        ) : null}
      </div>
      <span className={cn(widgetType.value, "shrink-0 text-right", toneClassName)}>
        {value}
      </span>
    </div>
  )
}

/** A group of `WidgetStat` rows. Rows sit close; groups sit apart. */
export function WidgetStatList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />
}

/** A named group inside the body, when a group genuinely needs naming. */
export function WidgetSection({
  title,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { title?: React.ReactNode }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-2", className)} {...props}>
      {title ? <h4 className={widgetType.section}>{title}</h4> : null}
      {children}
    </section>
  )
}
