/**
 * Dashboard widget design system.
 *
 * Read `./DESIGN.md` before using these. Every dashboard widget composes from
 * this module; widgets do not hand-roll cards, type scales, number formatting,
 * or chart furniture.
 */

export {
  WidgetCard,
  WidgetHeader,
  WidgetBody,
  WidgetFooter,
  WidgetMetric,
  WidgetStat,
  WidgetStatList,
  WidgetSection,
} from "./widget-shell"

export {
  WidgetEmpty,
  WidgetError,
  WidgetSkeleton,
  WidgetStatListSkeleton,
  WidgetChartSkeleton,
} from "./widget-states"

export {
  chartColors,
  categoricalSeries,
  seriesColor,
  axisProps,
  chartMargin,
  WidgetChartGrid,
  WidgetZeroLine,
  WidgetTooltip,
  WidgetChartLegend,
  WidgetChartInteractive,
} from "./chart-primitives"
export type { WidgetTooltipRow } from "./chart-primitives"

export {
  widgetType,
  isCompactSize,
  widgetPadding,
  widgetHeaderPadding,
  widgetMetricClass,
  chartTickFontSize,
} from "./widget-type"
export type { WidgetTypeRole } from "./widget-type"

export {
  formatCurrency,
  formatCompactCurrency,
  formatPercent,
  formatCount,
  formatRatio,
  formatTicks,
  formatDuration,
  pnlTone,
  pnlToneClass,
  pnlToneFill,
} from "./widget-format"
export type { PnlTone } from "./widget-format"
