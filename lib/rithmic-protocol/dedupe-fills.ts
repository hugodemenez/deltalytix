import type { RithmicProtocolFill } from './types'

/**
 * Rithmic `fill_id` is unique per execution on an account.
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

function fillOccursOnUtcYyyymmdd(
  fill: RithmicProtocolFill,
  yyyymmdd: string,
): boolean {
  if (fill.fillDate) {
    const date = fill.fillDate.replace(/-/g, '')
    if (date === yyyymmdd) return true
  }
  if (typeof fill.ssboe === 'number' && fill.ssboe > 0) {
    const at = new Date(fill.ssboe * 1000)
    const fromSsboe = `${at.getUTCFullYear()}${String(at.getUTCMonth() + 1).padStart(2, '0')}${String(at.getUTCDate()).padStart(2, '0')}`
    if (fromSsboe === yyyymmdd) return true
  }
  return false
}

/**
 * ReplayExecutions exists for plants (Rithmic Test) where ShowFillHistory
 * lags UTC today. On Apex / production, history already has those fills —
 * always-on replay was a second source of the same `fill_id`.
 */
export function shouldReplayRecentExecutions(
  historyFills: RithmicProtocolFill[],
  todayUtcYyyymmdd: string,
): boolean {
  return !historyFills.some((fill) =>
    fillOccursOnUtcYyyymmdd(fill, todayUtcYyyymmdd),
  )
}

function fillIdentityKey(fill: RithmicProtocolFill): string {
  const fillId = canonicalRithmicFillId(fill.fillId)
  if (fillId) {
    // ShowFillHistory stores transaction_type as a string ("BUY");
    // ExchangeOrderNotification / ReplayExecutions decode the same field as
    // enum 1/2. A composite key that includes transactionType, ssboe, or
    // basketId therefore keeps both copies.
    return `id|${fill.accountId}|${fillId}`
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
