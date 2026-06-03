/**
 * Shared numeric formatting helpers (no currency symbol).
 */

/**
 * Abbreviated number with an uppercase K/M suffix and no currency symbol.
 * The sign is preserved implicitly via the divided value.
 * e.g. 1500 -> "1.5K", -2_000_000 -> "-2.0M", 42 -> "42"
 */
export function formatNumberCompact(value: number): string {
  const absValue = Math.abs(value)
  if (absValue >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (absValue >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toFixed(0)
}
