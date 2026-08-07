/**
 * Locale-aware formatters shared by every dashboard widget.
 *
 * One canonical precision per kind of quantity, decided here rather than in each
 * widget, so peer values across the dashboard always agree. Do not call
 * `toFixed` inline in a widget.
 */

type Locale = "en" | "fr" | string

function intlLocale(locale: Locale): string {
  return locale === "fr" ? "fr-FR" : "en-US"
}

/**
 * Money, always in USD, always two decimals, always with the sign carried by the
 * caller's presentation (color plus an explicit `-`) rather than parentheses.
 *
 * `signDisplay: 'auto'` keeps the minus sign on the number itself so meaning is
 * never carried by color alone.
 */
export function formatCurrency(
  value: number,
  locale: Locale = "en",
  options: { maximumFractionDigits?: number; signDisplay?: "auto" | "always" | "never" } = {},
): string {
  const { maximumFractionDigits = 2, signDisplay = "auto" } = options
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits,
    signDisplay,
  }).format(value)
}

/**
 * Money for axis ticks and dense tables, where the full figure would not fit.
 * Never use this for a focal metric: the reader must be able to audit the exact
 * value somewhere on the widget.
 */
export function formatCompactCurrency(value: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

/** Percentages. One decimal by default; whole numbers when the value is exact. */
export function formatPercent(
  value: number,
  locale: Locale = "en",
  options: { maximumFractionDigits?: number } = {},
): string {
  const { maximumFractionDigits = 1 } = options
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value / 100)
}

/** Plain counts: trades, days, streaks. Grouped, never decimal. */
export function formatCount(value: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    maximumFractionDigits: 0,
  }).format(value)
}

/** A ratio such as risk/reward or profit factor. Two decimals, no unit. */
export function formatRatio(value: number, locale: Locale = "en"): string {
  if (!Number.isFinite(value)) return "∞"
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Ticks and points. Grouped, no decimals unless the caller asks. */
export function formatTicks(
  value: number,
  locale: Locale = "en",
  options: { maximumFractionDigits?: number } = {},
): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  }).format(value)
}

/**
 * A duration in seconds, rendered at the coarsest unit that stays honest.
 * `0` renders as `0s`, not an em dash or a blank.
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s"
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60

  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  if (minutes > 0) return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
  return `${secs}s`
}

/**
 * The sign of a P&L figure, as a discrete state rather than a color.
 * Pair with `pnlToneClass` so meaning never rests on color alone.
 */
export type PnlTone = "positive" | "negative" | "neutral"

export function pnlTone(value: number, epsilon = 0): PnlTone {
  if (value > epsilon) return "positive"
  if (value < -epsilon) return "negative"
  return "neutral"
}

/** Text color for a P&L tone, from theme tokens. Never raw Tailwind palette. */
export function pnlToneClass(tone: PnlTone): string {
  switch (tone) {
    case "positive":
      return "text-[hsl(var(--chart-win))]"
    case "negative":
      return "text-[hsl(var(--chart-loss))]"
    default:
      return "text-muted-foreground"
  }
}

/** Chart fill for a P&L tone, from theme tokens. */
export function pnlToneFill(tone: PnlTone): string {
  switch (tone) {
    case "positive":
      return "hsl(var(--chart-win))"
    case "negative":
      return "hsl(var(--chart-loss))"
    default:
      return "hsl(var(--muted-foreground))"
  }
}
