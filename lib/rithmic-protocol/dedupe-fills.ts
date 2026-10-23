import type { RithmicProtocolFill } from './types'

export type FillDropReason = 'duplicate_id' | 'duplicate_fields'

export interface DedupeFillsStats {
  received: number
  afterDedup: number
  dropped: Partial<Record<FillDropReason, number>>
}

/**
 * Rithmic `fill_id` is unique per execution on an account *for a trade date*.
 *
 * FIFO `entryId`/`closeId` join fill ids with `-`. When the same fill is
 * ingested twice, that produces a doubled journal row (`1452840-1452840`)
 * with 2× qty / 2× PnL. Collapse that repeated form so history (`1452840`)
 * and a doubled leftover still map to one fill.
 *
 * ReplayExecutions / exchange notifications sometimes send `basketId_fillId`
 * (`239200544_1319858`) while ShowFillHistory sends the bare `1319858`.
 */
export function canonicalRithmicFillId(
  fillId: string | undefined | null,
): string | undefined {
  if (fillId == null) return undefined
  const trimmed = String(fillId).trim()
  if (!trimmed) return undefined
  const parts = trimmed.split('-').filter((part) => part.length > 0)
  const collapsed =
    parts.length >= 2 && parts.every((part) => part === parts[0])
      ? parts[0]
      : trimmed
  const basketAndFill = /^(\d+)_(\d+)$/.exec(collapsed)
  if (basketAndFill) return basketAndFill[2]
  return collapsed
}

/** Raw plus canonical forms so a stored Replay `basketId_fillId` still matches. */
export function rithmicFillIdLookupValues(
  id: string | null | undefined,
): string[] {
  const trimmed = (id ?? '').trim()
  if (!trimmed) return []
  const canonical = canonicalRithmicFillId(trimmed)
  const values = new Set<string>([trimmed])
  if (canonical) values.add(canonical)
  return [...values]
}

export type RithmicProtocolFillPairIdentity = {
  accountNumber?: string | null
  instrument?: string | null
  entryDate?: string | null
  closeDate?: string | null
  entryId?: string | null
  closeId?: string | null
}

/**
 * Account + instrument + dates + canonical fill pair.
 *
 * Used to reuse a row stored with Replay `basketId_fillId` entry/close ids
 * after FIFO started persisting the bare history id. Dates stay in the key
 * so a recycled fill_id on a later session cannot steal the earlier UUID.
 */
export function rithmicProtocolFillPairKey(
  trade: RithmicProtocolFillPairIdentity,
): string | null {
  const entryId = canonicalRithmicFillId(trade.entryId)
  const closeId = canonicalRithmicFillId(trade.closeId)
  if (!entryId || !closeId) return null
  return [
    trade.accountNumber ?? '',
    trade.instrument ?? '',
    trade.entryDate ?? '',
    trade.closeDate ?? '',
    entryId,
    closeId,
  ].join('|')
}

/**
 * ShowFillHistory and ReplayExecutions stamp the same execution a few
 * seconds apart (seen up to ~10s on Lucid). A resync that takes the other
 * source must still land on the stored row instead of inserting a twin.
 */
export const RITHMIC_PROTOCOL_TIMESTAMP_TOLERANCE_MS = 2 * 60 * 1000

function parseIdentityTime(value: string | null | undefined): number | null {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : ms
}

/**
 * Same round-trip when account, instrument, canonical fill pair match and
 * both entry and close times sit within the jitter tolerance. The time
 * window (not a calendar day) keeps a recycled fill_id from a later session
 * from stealing an earlier row.
 */
export function isSameRithmicProtocolRoundTrip(
  a: RithmicProtocolFillPairIdentity,
  b: RithmicProtocolFillPairIdentity,
  toleranceMs = RITHMIC_PROTOCOL_TIMESTAMP_TOLERANCE_MS,
): boolean {
  const aEntryId = canonicalRithmicFillId(a.entryId)
  const aCloseId = canonicalRithmicFillId(a.closeId)
  if (!aEntryId || !aCloseId) return false
  if (aEntryId !== canonicalRithmicFillId(b.entryId)) return false
  if (aCloseId !== canonicalRithmicFillId(b.closeId)) return false
  if ((a.accountNumber ?? '') !== (b.accountNumber ?? '')) return false
  if ((a.instrument ?? '') !== (b.instrument ?? '')) return false
  const aEntry = parseIdentityTime(a.entryDate)
  const bEntry = parseIdentityTime(b.entryDate)
  const aClose = parseIdentityTime(a.closeDate)
  const bClose = parseIdentityTime(b.closeDate)
  if (aEntry == null || bEntry == null || aClose == null || bClose == null) {
    return false
  }
  return (
    Math.abs(aEntry - bEntry) <= toleranceMs &&
    Math.abs(aClose - bClose) <= toleranceMs
  )
}

export function resolveRithmicProtocolPersistedId(
  incoming: RithmicProtocolFillPairIdentity,
  existingRows: Array<{ id: string } & RithmicProtocolFillPairIdentity>,
): string | undefined {
  const incomingKey = rithmicProtocolFillPairKey(incoming)
  if (!incomingKey) return undefined
  for (const row of existingRows) {
    if (rithmicProtocolFillPairKey(row) === incomingKey) return row.id
  }
  // Close time is not part of identity: same fill pair, timestamps jittered
  // between ShowFillHistory and ReplayExecutions.
  for (const row of existingRows) {
    if (isSameRithmicProtocolRoundTrip(incoming, row)) return row.id
  }
  return undefined
}

/** BUY/1 and SELL/2 are the same side across history vs replay. */
function identitySide(transactionType: string | undefined): 'B' | 'S' {
  const t = String(transactionType ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  if (
    t === '1' ||
    t === 'BUY' ||
    t === 'B' ||
    t === 'BOT' ||
    t === 'LONG'
  ) {
    return 'B'
  }
  return 'S'
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
    // fill_id on a later session stays a distinct fill. Also include symbol
    // and fingerprint: fill_id is reused across instruments (and sometimes
    // distinct executions), and account+day+id alone dropped Lucid MNQ
    // 1319858 when an ES row shared the id.
    const symbol = (fill.symbol ?? '').trim().toUpperCase()
    const price = Number(fill.fillPrice || fill.avgFillPrice || 0)
    const size = Number(fill.fillSize || 0)
    return `id|${fill.accountId}|${fillDayKey(fill)}|${fillId}|${symbol}|${identitySide(fill.transactionType)}|${price}|${size}`
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

function bumpDrop(
  dropped: Partial<Record<FillDropReason, number>>,
  reason: FillDropReason,
) {
  dropped[reason] = (dropped[reason] ?? 0) + 1
}

/** Keep the first row per fill identity (history before replay). */
export function dedupeFillsWithStats(
  fills: RithmicProtocolFill[],
): { fills: RithmicProtocolFill[]; stats: DedupeFillsStats } {
  const seen = new Set<string>()
  const out: RithmicProtocolFill[] = []
  const dropped: Partial<Record<FillDropReason, number>> = {}
  for (const fill of fills) {
    const key = fillIdentityKey(fill)
    if (seen.has(key)) {
      bumpDrop(dropped, canonicalRithmicFillId(fill.fillId) ? 'duplicate_id' : 'duplicate_fields')
      continue
    }
    seen.add(key)
    const fillId = canonicalRithmicFillId(fill.fillId)
    out.push(fillId && fill.fillId !== fillId ? { ...fill, fillId } : fill)
  }
  return {
    fills: out,
    stats: {
      received: fills.length,
      afterDedup: out.length,
      dropped,
    },
  }
}

export function dedupeFills(fills: RithmicProtocolFill[]): RithmicProtocolFill[] {
  return dedupeFillsWithStats(fills).fills
}

export function markFillSource(
  fills: RithmicProtocolFill[],
  source: NonNullable<RithmicProtocolFill['source']>,
): RithmicProtocolFill[] {
  return fills.map((fill) => ({ ...fill, source }))
}

function sourceTimestampMs(fill: RithmicProtocolFill): number | null {
  if (typeof fill.ssboe === 'number' && fill.ssboe > 0) {
    const usecs = typeof fill.usecs === 'number' ? fill.usecs : 0
    return fill.ssboe * 1000 + Math.floor(usecs / 1000)
  }
  return null
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * ShowFillHistory is the settled record; ReplayExecutions only fills the gap
 * after the last fill history has published. Mixing both for the same period
 * double-counted executions on Lucid: Replay can split one history fill into
 * partials under different fill ids (history 1163441 ×5 vs replay 1163440 ×2
 * + 1163441 ×3), omit `fill_date`, and stamp a different time — so the
 * fingerprint dedupe kept both, FIFO saw extra contracts, and an open lot
 * carried into the next session as a phantom overnight trade.
 *
 * Per account, a replay fill is dropped when:
 * - history has the same canonical fill id + symbol within a day of it, or
 * - it is at or before the newest history fill (+ jitter tolerance).
 * Accounts with no history fills keep every replay fill.
 */
export function preferHistoryFills(
  fills: RithmicProtocolFill[],
  toleranceMs = RITHMIC_PROTOCOL_TIMESTAMP_TOLERANCE_MS,
): RithmicProtocolFill[] {
  const historyByAccount = new Map<
    string,
    { newestMs: number; idTimes: Map<string, number[]> }
  >()
  for (const fill of fills) {
    if (fill.source !== 'history') continue
    const accountId = fill.accountId || 'unknown'
    const entry = historyByAccount.get(accountId) ?? {
      newestMs: Number.NEGATIVE_INFINITY,
      idTimes: new Map<string, number[]>(),
    }
    const ts = sourceTimestampMs(fill)
    if (ts != null && ts > entry.newestMs) entry.newestMs = ts
    const fillId = canonicalRithmicFillId(fill.fillId)
    if (fillId) {
      const key = `${fillId}|${(fill.symbol ?? '').trim().toUpperCase()}`
      const times = entry.idTimes.get(key) ?? []
      times.push(ts ?? Number.NaN)
      entry.idTimes.set(key, times)
    }
    historyByAccount.set(accountId, entry)
  }
  if (historyByAccount.size === 0) return fills

  return fills.filter((fill) => {
    if (fill.source !== 'replay') return true
    const history = historyByAccount.get(fill.accountId || 'unknown')
    if (!history) return true
    const ts = sourceTimestampMs(fill)
    const fillId = canonicalRithmicFillId(fill.fillId)
    if (fillId) {
      const times = history.idTimes.get(
        `${fillId}|${(fill.symbol ?? '').trim().toUpperCase()}`,
      )
      if (
        times?.some(
          (historyTs) =>
            ts == null || Number.isNaN(historyTs) || Math.abs(historyTs - ts) <= DAY_MS,
        )
      ) {
        return false
      }
    }
    if (ts != null && Number.isFinite(history.newestMs)) {
      return ts > history.newestMs + toleranceMs
    }
    return true
  })
}
