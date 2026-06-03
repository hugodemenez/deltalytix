/**
 * Shared time/duration formatting helpers.
 */

/**
 * Formats a minute count as a compact hours/minutes string.
 * e.g. 75 -> "1h15m", 60 -> "1h", 20 -> "20m"
 */
export function formatMinutesToHoursMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hours > 0) return mins > 0 ? `${hours}h${mins}m` : `${hours}h`
  return `${mins}m`
}
