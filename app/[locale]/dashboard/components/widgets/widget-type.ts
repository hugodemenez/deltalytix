import { WidgetSize } from "../../types/dashboard"

/**
 * The complete set of type roles a dashboard widget may use.
 *
 * Widgets never invent sizes. If a piece of text does not map to one of these
 * roles, the composition is wrong, not the scale.
 *
 * Financial figures use `metric` / `value` (Sans + tabular-nums). `mono` is
 * reserved for operational identifiers: account ids, order ids, paths,
 * timestamps. Money is never mono.
 */
export const widgetType = {
  /** Widget title in the header. Rendered as a heading. */
  title: "text-sm font-medium leading-none tracking-tight",
  /** The single focal number of a KPI widget. */
  metric: "text-2xl font-semibold tabular-nums tracking-tight leading-none",
  /** A secondary focal number, when two share the frame. */
  metricSecondary: "text-lg font-semibold tabular-nums tracking-tight leading-none",
  /** Values in label/value rows. Always right-aligned against their label. */
  value: "text-sm font-medium tabular-nums",
  /** Names in label/value rows, axis titles, section names. */
  label: "text-xs text-muted-foreground",
  /** A section name inside the body, when a group genuinely needs naming. */
  section: "text-xs font-medium text-foreground",
  /** Units, periods, populations, qualifiers sitting under a value. */
  caption: "text-xs text-muted-foreground",
  /** Operational identifiers only. Never money. */
  mono: "font-mono text-xs tabular-nums",
} as const

export type WidgetTypeRole = keyof typeof widgetType

/** Widget sizes that need a denser type scale and tighter padding. */
export function isCompactSize(size: WidgetSize): boolean {
  return size === "tiny" || size === "small" || size === "small-long"
}

/**
 * Body padding for a widget at a given size. Use this instead of hand-rolling
 * `size === 'small' ? 'p-2' : 'p-4'` in every widget.
 */
export function widgetPadding(size: WidgetSize): string {
  switch (size) {
    case "tiny":
      return "p-2"
    case "small":
    case "small-long":
      return "p-3"
    default:
      return "p-4"
  }
}

/** Header padding for a widget at a given size. */
export function widgetHeaderPadding(size: WidgetSize): string {
  switch (size) {
    case "tiny":
      return "px-2 py-1.5"
    case "small":
    case "small-long":
      return "px-3 py-2"
    default:
      return "px-4 py-3"
  }
}

/**
 * Focal metric size at a given widget size. A `tiny` widget still has one
 * number that matters; it just cannot afford `text-2xl`.
 */
export function widgetMetricClass(size: WidgetSize): string {
  if (size === "tiny") return widgetType.value
  if (size === "small" || size === "small-long") return widgetType.metricSecondary
  return widgetType.metric
}

/** Recharts tick font size, matched to the type scale. */
export function chartTickFontSize(size: WidgetSize): number {
  return isCompactSize(size) ? 10 : 11
}
