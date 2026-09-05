import type { RithmicProtocolFill } from './types'

/**
 * Rithmic `fill_id` is unique per execution on an account *for a trade date*.
 *
 * FIFO `entryId`/`closeId` join fill ids with `-`. When the same fill is
 * ingested twice, that produces a doubled journal row (`1452840-1452840`)
 * with 2× qty / 2× PnL. Collapse that repeated form so history (`1452840`)
 * and a doubled leftover still map to one fill.
 */
export function canonicalRithmicFillId(
  fillId: string | undefined | null,
): string | undefined {
  if (fillId == null) return undefined
  const trimmed = String(fillId).trim()
  if (!trimmed) return undefined
  const parts = trimmed.split('-').filter((part) => part.length > 0)
  if (parts.length >= 2 && parts.every((part) => part === parts[0])) {
    return parts[0]
  }
  return trimmed
}

/**
 * Exchange trade date for identity (`fill_date`), not a UTC calendar day.
 * CME sessions roll ~17:00 CT, so `fill_date` can already be the next session
 * while `ssboe` is still the previous UTC date. Prefer `fillDate` when the
 * plant sent it; only fall back to ssboe truncated to a UTC day.
 */
export function fillDayKey(fill: RithmicProtocolFill): string {
  if (fill.fillDate) {
    const date = fill.fillDate.replace(/-/g, '')
    if (/^\d{8}$/.test(date)) return date
  }
  if (typeof fill.ssboe === 'number' && fill.ssboe > 0) {
    const at = new Date(fill.ssboe * 1000)
    return `${at.getUTCFullYear()}${String(at.getUTCMonth() + 1).padStart(2, '0')}${String(at.getUTCDate()).padStart(2, '0')}`
  }
  return ''
}

export function fillIdentityKey(fill: RithmicProtocolFill): string {
  const fillId = canonicalRithmicFillId(fill.fillId)
  if (fillId) {
    // ShowFillHistory stores transaction_type as a string ("BUY");
    // ExchangeOrderNotification / ReplayExecutions decode the same field as
    // enum 1/2. Do not put those, ssboe, or basketId in the key — they differ
    // across sources of the same execution. Include trade day so a recycled
    // fill_id on a later session stays a distinct fill.
    return `id|${fill.accountId}|${fillDayKey(fill)}|${fillId}`
  }
  return [
    'fields',
    fill.accountId,
    fill.basketId ?? '',
    fill.symbol,
    fill.transactionType,
    fill.fillPrice,
    fill.fillSize,
    fill.ssboe ?? '',
    fill.fillDate ?? '',
    fill.fillTime ?? '',
  ].join('|')
}

/** Keep the first row per fill identity (history before replay). */
export function dedupeFills(fills: RithmicProtocolFill[]): RithmicProtocolFill[] {
  const seen = new Set<string>()
  const out: RithmicProtocolFill[] = []
  for (const fill of fills) {
    const key = fillIdentityKey(fill)
    if (seen.has(key)) continue
    seen.add(key)
    const fillId = canonicalRithmicFillId(fill.fillId)
    out.push(fillId && fill.fillId !== fillId ? { ...fill, fillId } : fill)
  }
  return out
}
