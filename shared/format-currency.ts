/**
 * Shared currency formatting helpers.
 *
 * Each export mirrors a formatter that was previously duplicated inline across
 * dashboard, embed and landing components. Behaviour is intentionally preserved
 * 1:1 so existing call sites render identical output.
 */

/**
 * USD currency style with the locale's default fraction digits (two for USD).
 * e.g. 1234.5 -> "$1,234.50"
 */
export function formatCurrencyUSD(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

/**
 * "$" prefix with exactly two fraction digits, grouped using the runtime locale.
 * Accepts nullish values, returning "$0.00" to match the calendar helpers.
 * e.g. 1234.5 -> "$1,234.50", null -> "$0.00"
 */
export function formatCurrencyFixed2(value: number | null | undefined): string {
  if (value == null) return "$0.00"
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * USD currency style with configurable fraction digits (defaults to whole dollars).
 * e.g. 1234.5 -> "$1,235", (1234.5, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) -> "$1,234.50"
 */
export function formatCurrencyUSDWhole(
  value: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  })
}

/**
 * Abbreviated "$" amounts with an explicit sign and k/M suffixes (one decimal).
 * e.g. -1500 -> "-$1.5k", 2_000_000 -> "$2.0M", 42 -> "$42"
 */
export function formatCurrencyCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${value < 0 ? "-" : ""}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${value < 0 ? "-" : ""}$${(abs / 1_000).toFixed(1)}k`
  return `${value < 0 ? "-" : ""}$${abs.toFixed(0)}`
}

/**
 * Same as {@link formatCurrencyCompact} but guards against non-finite input,
 * returning "$0" for NaN/Infinity.
 */
export function formatCurrencyCompactSafe(value: number): string {
  if (!isFinite(value) || isNaN(value)) return "$0"
  return formatCurrencyCompact(value)
}

/**
 * Locale-aware currency with two fraction digits and a "$" symbol.
 * French places the symbol after the amount ("1 234,50 $"); other locales place
 * it before ("$1,234.50").
 */
export function formatCurrencyLocale(value: number, locale: string): string {
  const formatted = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

  return locale === "fr" ? `${formatted} $` : `$${formatted}`
}
