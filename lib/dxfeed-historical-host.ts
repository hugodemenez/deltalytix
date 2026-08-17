/**
 * Normalizes the DxFeed historical REST API base URL returned by auth.
 */

export function normalizeDxFeedHistoricalHost(value?: string | null): string {
  if (!value) return ''

  try {
    const parsed = new URL(value.startsWith('http') ? value : `https://${value}`)
    return `${parsed.protocol}//${parsed.host}`.replace(/\/$/, '')
  } catch {
    return value.replace(/\/$/, '')
  }
}
