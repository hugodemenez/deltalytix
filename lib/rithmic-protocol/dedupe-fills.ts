import type { RithmicProtocolFill } from './types'

export type FillDropReason = 'duplicate_id' | 'duplicate_fields'

export interface DedupeFillsStats {
  received: number
  afterDedup: number
  afterConsolidate?: number
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

/** Pieces of one order land within this window of each other in one source. */
export const RITHMIC_PROTOCOL_ORDER_PIECE_WINDOW_MS = 2 * 1000

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

function fillClockMs(fill: RithmicProtocolFill): number | null {
  const day = fillDayKey(fill)
  if (!/^\d{8}$/.test(day)) return null
  const date = `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`
  let time = '00:00:00'
  if (fill.fillTime) {
    const trimmed = fill.fillTime.trim()
    const clock = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(trimmed)
    if (clock) {
      time = `${clock[1].padStart(2, '0')}:${clock[2]}:${(clock[3] ?? '00').padStart(2, '0')}`
    } else {
      const digits = trimmed.replace(/\D/g, '')
      if (digits.length >= 6) {
        time = `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}`
      } else if (digits.length === 4) {
        time = `${digits.slice(0, 2)}:${digits.slice(2, 4)}:00`
      }
    }
  }
  const parsed = Date.parse(`${date}T${time}Z`)
  return Number.isNaN(parsed) ? null : parsed
}

function sourceTimestampMs(fill: RithmicProtocolFill): number | null {
  if (typeof fill.ssboe === 'number' && fill.ssboe > 0) {
    const usecs = typeof fill.usecs === 'number' ? fill.usecs : 0
    return fill.ssboe * 1000 + Math.floor(usecs / 1000)
  }
  // Plants that omit ssboe still stamp fill_date. Without this, clustering
  // treats every fill as t=0 and merges same-price orders across weeks.
  return fillClockMs(fill)
}

const CHICAGO_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
})

/**
 * CME Globex trade date for an instant: the Chicago calendar day, rolled to
 * the next day at 17:00 CT, and weekend sessions (Fri 17:00 CT onward,
 * Sunday evening open) rolled to Monday. Matches the plant's `fill_date` on
 * ordinary sessions.
 *
 * Limitation: there is no exchange holiday calendar (`cme-session.ts` only
 * knows the weekly close), so a holiday session (e.g. Thanksgiving) is dated
 * the holiday instead of the next business day it clears on, and non-CME
 * venues (Eurex) roll at the wrong hour. Only the unbasketed per-date rule
 * and session-carry logging depend on this date; basketed orders are matched
 * by basket, not trade date.
 */
export function cmeTradeDateFromMs(ms: number): string {
  const parts = Object.fromEntries(
    CHICAGO_PARTS.formatToParts(new Date(ms)).map((part) => [part.type, part.value]),
  ) as Record<string, string>
  const day = new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
  )
  if (Number(parts.hour) >= 17) day.setUTCDate(day.getUTCDate() + 1)
  const weekday = day.getUTCDay()
  if (weekday === 6) day.setUTCDate(day.getUTCDate() + 2)
  else if (weekday === 0) day.setUTCDate(day.getUTCDate() + 1)
  return `${day.getUTCFullYear()}${String(day.getUTCMonth() + 1).padStart(2, '0')}${String(day.getUTCDate()).padStart(2, '0')}`
}

/**
 * Trade date used to compare history with live fills. Prefer the plant's
 * `fill_date` (already the exchange trade date). Replay rows can omit it, so
 * fall back to the CME session of `ssboe` rather than a UTC calendar day —
 * that is what kept history and replay on the same key without the old ±1
 * day widening.
 */
export function fillTradeDateKey(fill: RithmicProtocolFill): string {
  if (fill.fillDate) {
    const date = fill.fillDate.replace(/-/g, '')
    if (/^\d{8}$/.test(date)) return date
  }
  if (typeof fill.ssboe === 'number' && fill.ssboe > 0) {
    const usecs = typeof fill.usecs === 'number' ? fill.usecs : 0
    return cmeTradeDateFromMs(fill.ssboe * 1000 + Math.floor(usecs / 1000))
  }
  return ''
}

function bookDateKey(fill: RithmicProtocolFill, tradeDate: string): string {
  const symbol = (fill.symbol ?? '').trim().toUpperCase()
  return `${fill.accountId || 'unknown'}|${symbol}|${tradeDate}`
}

function sidePriceKey(fill: RithmicProtocolFill): string {
  const price = Number(fill.fillPrice || fill.avgFillPrice || 0)
  return `${identitySide(fill.transactionType)}|${price}`
}

/**
 * True when every live fill is restated by history on the same side and price
 * within `toleranceMs` (or when either side lacks a clock). Quantity is pooled
 * across history rows in that window, so an aggregated history row equals
 * split live pieces and split history pieces equal one aggregated live row —
 * but only at the same price, so a rollup priced at one leg never hides the
 * other leg.
 */
function historyRestatesLive(
  history: RithmicProtocolFill[],
  live: RithmicProtocolFill[],
  toleranceMs: number,
): boolean {
  const capacity = history.map((fill) => ({
    key: sidePriceKey(fill),
    ms: sourceTimestampMs(fill),
    left: Math.abs(Number(fill.fillSize) || 0),
  }))
  const ordered = [...live].sort(
    (a, b) => (sourceTimestampMs(a) ?? 0) - (sourceTimestampMs(b) ?? 0),
  )
  for (const fill of ordered) {
    const key = sidePriceKey(fill)
    const ms = sourceTimestampMs(fill)
    let needed = Math.abs(Number(fill.fillSize) || 0)
    const candidates = capacity
      .map((slot) => ({
        slot,
        delta: ms == null || slot.ms == null ? 0 : Math.abs(ms - slot.ms),
      }))
      .filter(({ slot, delta }) => slot.key === key && slot.left > 1e-9 && delta <= toleranceMs)
      .sort((left, right) => left.delta - right.delta)
    for (const { slot } of candidates) {
      if (needed <= 1e-9) break
      const take = Math.min(slot.left, needed)
      slot.left -= take
      needed -= take
    }
    if (needed > 1e-9) return false
  }
  return true
}

function fillQuantity(fill: RithmicProtocolFill): number {
  return Math.abs(Number(fill.fillSize) || 0)
}

/**
 * Live won a trade date: how much of each history fill live does not account
 * for. History and live are matched on side and time (within `toleranceMs`,
 * or when either side lacks a clock) with quantities pooled and price
 * ignored, so a rollup priced at one leg still matches both live legs. Pairs
 * are taken closest in time first. Only the matched quantity is redundant;
 * the rest is an execution live never saw.
 */
function historyQuantityLiveMissed(
  history: RithmicProtocolFill[],
  live: RithmicProtocolFill[],
  toleranceMs: number,
): number[] {
  const historyLeft = history.map(fillQuantity)
  const liveLeft = live.map(fillQuantity)
  const pairs: Array<{ h: number; l: number; delta: number }> = []
  history.forEach((historyFill, h) => {
    const side = identitySide(historyFill.transactionType)
    const historyMs = sourceTimestampMs(historyFill)
    live.forEach((liveFill, l) => {
      if (identitySide(liveFill.transactionType) !== side) return
      const liveMs = sourceTimestampMs(liveFill)
      const delta =
        historyMs == null || liveMs == null ? 0 : Math.abs(historyMs - liveMs)
      if (delta <= toleranceMs) pairs.push({ h, l, delta })
    })
  })
  pairs.sort((a, b) => a.delta - b.delta || a.h - b.h || a.l - b.l)
  for (const { h, l } of pairs) {
    const take = Math.min(historyLeft[h], liveLeft[l])
    if (take <= 1e-9) continue
    historyLeft[h] -= take
    liveLeft[l] -= take
  }
  return historyLeft
}

export type HistoryPreferenceDecision = {
  accountId: string
  symbol: string
  tradeDate: string
  /**
   * Set when the decision was made per order (shared `basketId`). Baskets
   * the two sources reported for one order (linked by a shared fill id) are
   * joined with `,`.
   */
  basketId?: string
  historyFills: number
  liveFills: number
  /** Which source's rows were kept. */
  kept: 'history' | 'live'
  /**
   * Date fallback, live won: history fills kept (whole or as the leftover
   * quantity) because live does not account for them. They are returned
   * tagged `replay`, as part of the live version.
   */
  historyBackfilled: number
}

function totalSize(fills: RithmicProtocolFill[]): number {
  return fills.reduce((sum, fill) => sum + fillQuantity(fill), 0)
}

function basketIdOf(fill: RithmicProtocolFill): string {
  return (fill.basketId ?? '').trim()
}

/**
 * Rows of one source that restate each other, or null. A candidate must carry
 * the order's last fill id and share it with another row of the same source:
 * fill ids are unique per execution, so two rows with one fill id and
 * different sizes can only be a restatement (a rollup next to its pieces).
 *
 * - Size equals the other rows' sum (and there are at least two): the
 *   candidate is a rollup of pieces this source also has. Drop the rollup;
 *   the pieces carry the real prices.
 * - Size is larger than the other rows' sum: the candidate is the fuller
 *   report and the rows next to it are only part of the order (live 11 ×2
 *   next to the single piece 11 ×1). Drop those partial pieces.
 *
 * `neighborhoodMs` is set when the rows are a whole book-date rather than one
 * basket (unbasketed rows). Nothing then ties the rows to one order, so
 * "the other rows" are only the unbroken fill-id run ending at the
 * candidate's id among rows within that window of it (the order piece
 * window: pieces of one order in one source land within 2s). Pieces 10 + 11
 * for rollup 11 collapse; 9 + 11 do not, and an unrelated order next to the
 * run (8, or a later 12) neither makes up nor hides the sum
 * (`findUnbasketedRestatement`). Failing the equal sum, the rollup is kept
 * and only rows sharing its fill id are dropped.
 */
function findSourceRestatement(
  rows: RithmicProtocolFill[],
  neighborhoodMs?: number,
): RithmicProtocolFill[] | null {
  for (const candidate of rows) {
    const id = numericFillId(candidate)
    if (!Number.isFinite(id)) continue
    if (neighborhoodMs != null) {
      const restated = findUnbasketedRestatement(rows, candidate, id, neighborhoodMs)
      if (restated) return restated
      continue
    }
    const others = rows.filter((row) => row !== candidate)
    if (others.length === 0) continue
    // Equal to the largest other id means another row shares this fill id.
    if (id !== Math.max(...others.map(numericFillId))) continue
    const size = fillQuantity(candidate)
    const othersSize = totalSize(others)
    const equalSum = Math.abs(size - othersSize) <= 1e-9
    if (equalSum && others.length < 2) {
      // A rollup of one piece is that piece; leave it to identity dedupe.
      continue
    }
    if (equalSum) return [candidate]
    if (size > othersSize) return others
  }
  return null
}

/**
 * Unbasketed restatement of `candidate` (fill id `id`), or null. The
 * comparison set is the unbroken fill-id run ending at `id` among the other
 * rows within `neighborhoodMs` of the candidate ({10, 11} for rollup 11):
 * rows outside that run (a lower id past a gap, any higher id, a non-numeric
 * id) are another order and neither block nor stand in for a piece.
 *
 * - The run must hold another row with the candidate's fill id.
 * - At least two run rows summing to the candidate's size: drop the rollup.
 * - Otherwise keep the rollup and drop only the rows sharing its fill id,
 *   when it is larger than they are.
 */
function findUnbasketedRestatement(
  rows: RithmicProtocolFill[],
  candidate: RithmicProtocolFill,
  id: number,
  neighborhoodMs: number,
): RithmicProtocolFill[] | null {
  const candidateMs = sourceTimestampMs(candidate)
  const nearby = rows.filter((row) => {
    if (row === candidate) return false
    const ms = sourceTimestampMs(row)
    return candidateMs == null || ms == null || Math.abs(ms - candidateMs) <= neighborhoodMs
  })
  const sameId = nearby.filter((row) => numericFillId(row) === id)
  if (sameId.length === 0) return null
  const size = fillQuantity(candidate)
  if (Number.isSafeInteger(id)) {
    const ids = new Set(nearby.map(numericFillId).filter(Number.isSafeInteger))
    let start = id
    while (ids.has(start - 1)) start -= 1
    const run = nearby.filter((row) => {
      const rowId = numericFillId(row)
      return Number.isSafeInteger(rowId) && rowId >= start && rowId <= id
    })
    if (run.length >= 2 && Math.abs(size - totalSize(run)) <= 1e-9) {
      return [candidate]
    }
  }
  return size > totalSize(sameId) ? sameId : null
}

/**
 * One source's version of one order, ready to compare with the other source.
 *
 * `unique` drops exact re-deliveries (same identity) so they do not inflate
 * the total; `dedupeFills` removes them from the output later. `redundant`
 * are rows that restate this source's own rows (`findSourceRestatement`):
 * a rollup next to all of its pieces, or partial pieces next to a fuller
 * rollup. Order-history fallback rows share a tag with real executions
 * (`replay` on one fetch path, `history` on another), so one bucket can hold
 * both the rollup (11 ×2) and the pieces (10 ×1 + 11 ×1). Counting both
 * doubles the order.
 */
function collapseSourceOrder(
  fills: RithmicProtocolFill[],
  neighborhoodMs?: number,
): {
  unique: RithmicProtocolFill[]
  redundant: RithmicProtocolFill[]
} {
  const seen = new Set<string>()
  let rows: RithmicProtocolFill[] = []
  for (const fill of fills) {
    const key = fillIdentityKey(fill)
    if (seen.has(key)) continue
    seen.add(key)
    rows.push(fill)
  }
  const redundant: RithmicProtocolFill[] = []
  for (;;) {
    const restated = findSourceRestatement(rows, neighborhoodMs)
    if (!restated) break
    redundant.push(...restated)
    const gone = new Set(restated)
    rows = rows.filter((row) => !gone.has(row))
  }
  return { unique: rows, redundant }
}

/**
 * Collapse one source's rows of a per-date group. Basketed rows collapse per
 * basket and side, as in the per-order path. Unbasketed rows collapse per
 * side over the book-date, comparing each row only with rows within the
 * order piece window (`RITHMIC_PROTOCOL_ORDER_PIECE_WINDOW_MS`), since
 * nothing else ties them to one order. The cross-source tolerance is for
 * clock skew between sources and would take other orders for pieces.
 */
function collapseSourceDate(
  fills: RithmicProtocolFill[],
): { unique: RithmicProtocolFill[]; redundant: RithmicProtocolFill[] } {
  const parts = new Map<string, RithmicProtocolFill[]>()
  for (const fill of fills) {
    const key = `${identitySide(fill.transactionType)}|${basketIdOf(fill)}`
    const list = parts.get(key) ?? []
    list.push(fill)
    parts.set(key, list)
  }
  const unique = new Set<RithmicProtocolFill>()
  const redundant: RithmicProtocolFill[] = []
  for (const [key, part] of parts) {
    const unbasketed = key.endsWith('|')
    const version = collapseSourceOrder(
      part,
      unbasketed ? RITHMIC_PROTOCOL_ORDER_PIECE_WINDOW_MS : undefined,
    )
    for (const fill of version.unique) unique.add(fill)
    redundant.push(...version.redundant)
  }
  // Keep the caller's order so matching stays deterministic.
  return { unique: fills.filter((fill) => unique.has(fill)), redundant }
}

/**
 * One order seen by both sources: keep the larger filled size (a partial
 * report never wins), then the version with more pieces (real executions at
 * real prices, not a rollup), then history (settled record). Inputs are the
 * collapsed versions from `collapseSourceOrder`.
 */
function historyWinsOrder(
  history: RithmicProtocolFill[],
  live: RithmicProtocolFill[],
): boolean {
  const historySize = totalSize(history)
  const liveSize = totalSize(live)
  if (Math.abs(historySize - liveSize) > 1e-9) return historySize > liveSize
  return history.length >= live.length
}

/**
 * A basket id names one order across the whole session, so the order key
 * (scope + basket id) carries no trade date: an order filled partly before
 * the 16:00 CT break and partly after the 17:00 reopen, or one whose rows
 * disagree on the trade date (a replay row without `fill_date` on a holiday
 * session), stays one order.
 */
function orderScope(fill: RithmicProtocolFill): string {
  const symbol = (fill.symbol ?? '').trim().toUpperCase()
  return `${fill.accountId || 'unknown'}|${symbol}|${identitySide(fill.transactionType)}`
}

type OrderBasket = {
  basketId: string
  /** Account, symbol and side. */
  scope: string
  fills: RithmicProtocolFill[]
}

/**
 * Basket ids are not unique forever. Fills of one key more than this far
 * apart (after sorting by time) are treated as separate orders.
 */
export const RITHMIC_PROTOCOL_BASKET_REUSE_GAP_MS = 72 * 60 * 60 * 1000

function splitReusedBasket(fills: RithmicProtocolFill[]): RithmicProtocolFill[][] {
  const timed = fills
    .map((fill) => ({ fill, ms: sourceTimestampMs(fill) }))
    .filter((row): row is { fill: RithmicProtocolFill; ms: number } => row.ms != null)
    .sort((a, b) => a.ms - b.ms)
  const segments: RithmicProtocolFill[][] = []
  let lastMs = Number.NEGATIVE_INFINITY
  for (const { fill, ms } of timed) {
    if (segments.length === 0 || ms - lastMs > RITHMIC_PROTOCOL_BASKET_REUSE_GAP_MS) {
      segments.push([])
    }
    segments[segments.length - 1].push(fill)
    lastMs = ms
  }
  // Rows without any clock cannot be placed in time; keep them with the
  // first occurrence of the basket.
  const untimed = fills.filter((fill) => sourceTimestampMs(fill) == null)
  if (untimed.length > 0) {
    if (segments.length === 0) segments.push([])
    segments[0].push(...untimed)
  }
  return segments
}

/**
 * The two sources normally report one order under one basket id. If they
 * ever disagree, both versions would be single-source orders and both kept.
 * Link baskets whose rows from different sources share a canonical fill id
 * (same account, symbol and side — part of the basket key — and within
 * `toleranceMs`), so the order is still compared as one.
 */
function linkBasketsAcrossSources(
  baskets: Map<string, OrderBasket>,
  toleranceMs: number,
): Array<{ basketIds: string[]; fills: RithmicProtocolFill[] }> {
  const parent = new Map<string, string>()
  for (const key of baskets.keys()) parent.set(key, key)
  const root = (key: string): string => {
    let at = key
    while (parent.get(at) !== at) at = parent.get(at)!
    parent.set(key, at)
    return at
  }

  const byFill = new Map<
    string,
    Array<{ basketKey: string; source: RithmicProtocolFill['source']; ms: number | null }>
  >()
  for (const [basketKey, basket] of baskets) {
    for (const fill of basket.fills) {
      const fillId = canonicalRithmicFillId(fill.fillId)
      if (!fillId) continue
      const key = `${basket.scope}|${fillId}`
      const list = byFill.get(key) ?? []
      list.push({ basketKey, source: fill.source, ms: sourceTimestampMs(fill) })
      byFill.set(key, list)
    }
  }
  for (const rows of byFill.values()) {
    for (let i = 0; i < rows.length; i += 1) {
      for (let j = i + 1; j < rows.length; j += 1) {
        const a = rows[i]
        const b = rows[j]
        if (a.basketKey === b.basketKey || a.source === b.source) continue
        if (a.ms == null || b.ms == null || Math.abs(a.ms - b.ms) > toleranceMs) continue
        const ra = root(a.basketKey)
        const rb = root(b.basketKey)
        if (ra !== rb) parent.set(rb, ra)
      }
    }
  }

  const linked = new Map<string, { basketIds: string[]; fills: RithmicProtocolFill[] }>()
  for (const [key, basket] of baskets) {
    const group = linked.get(root(key)) ?? { basketIds: [], fills: [] }
    if (!group.basketIds.includes(basket.basketId)) group.basketIds.push(basket.basketId)
    group.fills.push(...basket.fills)
    linked.set(root(key), group)
  }
  return [...linked.values()]
}

/**
 * Reconcile ShowFillHistory (`source: 'history'`) with live executions
 * (`source: 'replay'`) without dropping a real execution or counting one
 * twice.
 *
 * Either source can be a rollup. Order-history fallback rows are tagged
 * `history` or `replay` depending on the fetch path, and they report one row
 * per order: the last fill id, the order's total size, one price. Example
 * (LFF050 Nov 17): order-history `1232782` SELL ×2 @ 26830.50 for an order
 * replay had as `1232781` ×1 @ 26830.75 + `1232782` ×1 @ 26830.50. On older
 * Phidias/Bulenox ledgers it is the reverse: history has the split pieces and
 * `replay` is the rollup.
 *
 * 1. Per order (same account, symbol, side and `basketId`; split only when
 *    fills sit more than 72 h apart, for a reused basket id; baskets the two
 *    sources gave one order are linked by a shared fill id): first collapse
 *    each source's own restatements (`collapseSourceOrder`). When both
 *    sources have the order, keep the larger filled size, then the source
 *    with more pieces — the real executions at their real prices — then
 *    history (settled record). Orders seen by only one source are always
 *    kept. Every prod ledger row carries a basketId, and on every order both
 *    sources had, side and total size agreed (2026-11-24 fleet scan, 232
 *    orders).
 * 2. A book-date (account, symbol, CME trade date) where either source has a
 *    row without a basketId goes wholly through a per-trade-date rule, so an
 *    unbasketed rollup is compared with the basketed pieces it restates
 *    instead of both being kept. Each source is collapsed first
 *    (`collapseSourceDate`), and only its unique rows are compared. Keep
 *    history when it restates every live fill (same side and price within
 *    the tolerance, quantity pooled); otherwise keep live, plus the history
 *    quantity live does not account for (`historyQuantityLiveMissed`),
 *    re-tagged `replay` so consolidation cannot use it to drop live fills.
 *    A resized leftover with the same identity as a kept row is added to
 *    that row (`foldResizedLeftovers`) so identity dedupe cannot drop it.
 *
 * There is no ±1-day "coverage" any more: the old rule let one rollup row
 * mark Nov 16–18 as covered and dropped 28 live fills, leaving a phantom −2
 * short that mis-paired every later trade.
 *
 * Rows that are neither `history` nor `replay` (manual) pass through.
 */
export function preferHistoryFillsWithDecisions(
  fills: RithmicProtocolFill[],
  toleranceMs = RITHMIC_PROTOCOL_TIMESTAMP_TOLERANCE_MS,
): { fills: RithmicProtocolFill[]; decisions: HistoryPreferenceDecision[] } {
  const dropped = new Set<RithmicProtocolFill>()
  const replaced = new Map<RithmicProtocolFill, RithmicProtocolFill>()
  const resizedLeftovers = new Set<RithmicProtocolFill>()
  const decisions: HistoryPreferenceDecision[] = []

  const plant = fills.filter(
    (fill) => fill.source === 'replay' || fill.source === 'history',
  )
  const tradeDates = new Map(plant.map((fill) => [fill, fillTradeDateKey(fill)]))
  const unbasketedBookDates = new Set<string>()
  for (const fill of plant) {
    if (!basketIdOf(fill)) {
      unbasketedBookDates.add(bookDateKey(fill, tradeDates.get(fill)!))
    }
  }

  const baskets = new Map<string, OrderBasket>()
  const dateGroups = new Map<
    string,
    { history: RithmicProtocolFill[]; live: RithmicProtocolFill[]; tradeDate: string }
  >()
  for (const fill of plant) {
    const tradeDate = tradeDates.get(fill)!
    const bookDate = bookDateKey(fill, tradeDate)
    const basketId = basketIdOf(fill)
    if (basketId && !unbasketedBookDates.has(bookDate)) {
      const scope = orderScope(fill)
      const key = `${scope}|${basketId}`
      const basket = baskets.get(key) ?? { basketId, scope, fills: [] }
      basket.fills.push(fill)
      baskets.set(key, basket)
      continue
    }
    const group = dateGroups.get(bookDate) ?? { history: [], live: [], tradeDate }
    if (fill.source === 'replay') group.live.push(fill)
    else group.history.push(fill)
    dateGroups.set(bookDate, group)
  }

  for (const { basketIds, fills: basketFills } of linkBasketsAcrossSources(baskets, toleranceMs)) {
    for (const order of splitReusedBasket(basketFills)) {
      const history = order.filter((fill) => fill.source === 'history')
      const live = order.filter((fill) => fill.source === 'replay')
      const historyVersion = collapseSourceOrder(history)
      const liveVersion = collapseSourceOrder(live)
      for (const fill of historyVersion.redundant) dropped.add(fill)
      for (const fill of liveVersion.redundant) dropped.add(fill)
      if (history.length === 0 || live.length === 0) continue
      const keepHistory = historyWinsOrder(historyVersion.unique, liveVersion.unique)
      for (const fill of keepHistory ? live : history) dropped.add(fill)
      const first = order[0]
      decisions.push({
        accountId: first.accountId || 'unknown',
        symbol: (first.symbol ?? '').trim().toUpperCase(),
        tradeDate: tradeDates.get(first) ?? '',
        basketId: basketIds.join(','),
        historyFills: history.length,
        liveFills: live.length,
        kept: keepHistory ? 'history' : 'live',
        historyBackfilled: 0,
      })
    }
  }

  for (const group of dateGroups.values()) {
    // Undated rows cannot be compared per trade date; keep both.
    if (!group.tradeDate) continue
    const historyVersion = collapseSourceDate(group.history)
    const liveVersion = collapseSourceDate(group.live)
    for (const fill of historyVersion.redundant) dropped.add(fill)
    for (const fill of liveVersion.redundant) dropped.add(fill)
    if (group.history.length === 0 || group.live.length === 0) continue
    const history = historyVersion.unique
    const live = liveVersion.unique
    const keepHistory = historyRestatesLive(history, live, toleranceMs)
    let backfilled = 0
    if (keepHistory) {
      for (const fill of group.live) dropped.add(fill)
    } else {
      const missed = historyQuantityLiveMissed(history, live, toleranceMs)
      const leftover = new Map(history.map((fill, index) => [fill, missed[index]]))
      for (const fill of group.history) {
        // Re-deliveries and rollups are not in `leftover`: their quantity is
        // already counted by the row they restate.
        const left = leftover.get(fill) ?? 0
        if (left <= 1e-9) {
          dropped.add(fill)
          continue
        }
        backfilled += 1
        // The backfill joins the live version. Tag it `replay` so
        // consolidation sums it with the live pieces at its price instead of
        // letting it "cover" (drop) live fills it was found not to restate.
        const resize = left < fillQuantity(fill) - 1e-9
        const backfill: RithmicProtocolFill = {
          ...fill,
          source: 'replay',
          ...(resize ? { fillSize: left } : {}),
        }
        replaced.set(fill, backfill)
        if (resize) resizedLeftovers.add(backfill)
      }
    }
    const first = group.history[0]
    decisions.push({
      accountId: first.accountId || 'unknown',
      symbol: (first.symbol ?? '').trim().toUpperCase(),
      tradeDate: group.tradeDate,
      historyFills: group.history.length,
      liveFills: group.live.length,
      kept: keepHistory ? 'history' : 'live',
      historyBackfilled: backfilled,
    })
  }
  const kept = fills
    .filter((fill) => !dropped.has(fill))
    .map((fill) => replaced.get(fill) ?? fill)
  return { fills: foldResizedLeftovers(kept, resizedLeftovers), decisions }
}

/**
 * A resized leftover (history quantity live never saw) can take the exact
 * identity of a kept row: a rollup carries the order's last fill id, live
 * usually has that last piece, and the leftover can come out at the same
 * size. `dedupeFills` would then keep only one of them and lose the
 * leftover. Add the leftover's quantity to the kept row instead (on a copy).
 * Every kept row with that identity gets the same enlarged copy, so a
 * re-delivery of it is still dropped by `dedupeFills` and counted there.
 */
function foldResizedLeftovers(
  fills: RithmicProtocolFill[],
  leftovers: Set<RithmicProtocolFill>,
): RithmicProtocolFill[] {
  if (leftovers.size === 0) return fills
  const byKey = new Map<string, RithmicProtocolFill[]>()
  for (const fill of fills) {
    const key = fillIdentityKey(fill)
    const list = byKey.get(key) ?? []
    list.push(fill)
    byKey.set(key, list)
  }
  const gone = new Set<RithmicProtocolFill>()
  const enlarged = new Map<RithmicProtocolFill, RithmicProtocolFill>()
  for (const rows of byKey.values()) {
    const guests = rows.filter((fill) => leftovers.has(fill))
    if (guests.length === 0) continue
    let hosts = rows.filter((fill) => !leftovers.has(fill))
    if (hosts.length === 0) {
      if (guests.length === 1) continue
      hosts = [guests.shift()!]
    }
    const fillSize = fillQuantity(hosts[0]) + totalSize(guests)
    for (const fill of guests) gone.add(fill)
    for (const fill of hosts) enlarged.set(fill, { ...fill, fillSize })
  }
  return fills
    .filter((fill) => !gone.has(fill))
    .map((fill) => enlarged.get(fill) ?? fill)
}

export function preferHistoryFills(
  fills: RithmicProtocolFill[],
  toleranceMs = RITHMIC_PROTOCOL_TIMESTAMP_TOLERANCE_MS,
): RithmicProtocolFill[] {
  return preferHistoryFillsWithDecisions(fills, toleranceMs).fills
}

export type SessionCarry = {
  accountId: string
  symbol: string
  /** Trade date whose session ended with this open position. */
  tradeDate: string
  net: number
}

/**
 * Positions still open at the end of a trade date, per account + symbol.
 * A real swing hold shows up here too; callers log it so a phantom
 * overnight lot (a missing or double-counted fill) is visible in sync logs
 * instead of silently mis-pairing the next session.
 */
export function sessionCarryOvers(fills: RithmicProtocolFill[]): SessionCarry[] {
  const books = new Map<string, RithmicProtocolFill[]>()
  for (const fill of fills) {
    if (fill.source === 'manual-retired') continue
    const key = `${fill.accountId || 'unknown'}|${(fill.symbol ?? '').trim().toUpperCase()}`
    const list = books.get(key) ?? []
    list.push(fill)
    books.set(key, list)
  }
  const carries: SessionCarry[] = []
  for (const book of books.values()) {
    const sorted = [...book].sort(
      (a, b) => (sourceTimestampMs(a) ?? 0) - (sourceTimestampMs(b) ?? 0),
    )
    let net = 0
    let current = ''
    for (const fill of sorted) {
      const tradeDate = fillTradeDateKey(fill)
      if (current && tradeDate !== current && Math.abs(net) > 1e-9) {
        carries.push({
          accountId: fill.accountId || 'unknown',
          symbol: (fill.symbol ?? '').trim().toUpperCase(),
          tradeDate: current,
          net,
        })
      }
      current = tradeDate
      net += identitySide(fill.transactionType) === 'B'
        ? Math.abs(Number(fill.fillSize) || 0)
        : -Math.abs(Number(fill.fillSize) || 0)
    }
    if (current && Math.abs(net) > 1e-9) {
      carries.push({
        accountId: sorted[0].accountId || 'unknown',
        symbol: (sorted[0].symbol ?? '').trim().toUpperCase(),
        tradeDate: current,
        net,
      })
    }
  }
  return carries
}

function orderGroupKey(fill: RithmicProtocolFill): string {
  const symbol = (fill.symbol ?? '').trim().toUpperCase()
  const price = Number(fill.fillPrice || fill.avgFillPrice || 0)
  return `${fill.accountId || 'unknown'}|${symbol}|${identitySide(fill.transactionType)}|${price}`
}

function numericFillId(fill: RithmicProtocolFill): number {
  const id = canonicalRithmicFillId(fill.fillId)
  const n = id ? Number(id) : Number.NaN
  return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY
}

type OrderCluster = {
  fills: RithmicProtocolFill[]
  startMs: number
  endMs: number
  basketId?: string
}

function clusterOneSource(
  fills: RithmicProtocolFill[],
  windowMs: number,
): OrderCluster[] {
  const sorted = [...fills].sort(
    (a, b) => (sourceTimestampMs(a) ?? 0) - (sourceTimestampMs(b) ?? 0),
  )
  const clusters: OrderCluster[] = []
  for (const fill of sorted) {
    const ts = sourceTimestampMs(fill) ?? 0
    const last = clusters[clusters.length - 1]
    const sameBasket =
      last?.basketId != null && fill.basketId != null && last.basketId === fill.basketId
    if (last && (sameBasket || ts - last.endMs <= windowMs)) {
      last.fills.push(fill)
      last.endMs = Math.max(last.endMs, ts)
      continue
    }
    clusters.push({ fills: [fill], startMs: ts, endMs: ts, basketId: fill.basketId })
  }
  return clusters
}

function mergeCluster(cluster: OrderCluster): RithmicProtocolFill {
  if (cluster.fills.length === 1) return cluster.fills[0]
  const first = cluster.fills[0]
  const canonical = cluster.fills.reduce((best, fill) =>
    numericFillId(fill) > numericFillId(best) ? fill : best,
  )
  const size = cluster.fills.reduce(
    (sum, fill) => sum + Math.abs(Number(fill.fillSize) || 0),
    0,
  )
  const fillId = canonicalRithmicFillId(canonical.fillId) ?? canonical.fillId
  return { ...first, fillId, fillSize: size }
}

/**
 * Whether two clusters may be the same order. Basketed rows were already
 * reconciled per order by `preferHistoryFillsWithDecisions`, so clusters
 * whose baskets are all known and disjoint are different orders — even at the
 * same price a few seconds apart. A cluster with an unbasketed row could be
 * anything.
 */
function clustersMayBeSameOrder(a: OrderCluster, b: OrderCluster): boolean {
  const left = new Set<string>()
  for (const fill of a.fills) {
    const basketId = basketIdOf(fill)
    if (!basketId) return true
    left.add(basketId)
  }
  let shared = false
  for (const fill of b.fills) {
    const basketId = basketIdOf(fill)
    if (!basketId) return true
    if (left.has(basketId)) shared = true
  }
  return shared
}

/**
 * Rithmic reports one order differently per source: ShowFillHistory can roll
 * the partials up under the last fill id with the order's total size
 * (1245663 ×5), while ReplayExecutions sends each piece (1245660 ×1 …
 * 1245663 ×2). Mixing them mis-sized orders (too many or too few contracts),
 * left lots open and paired them with the wrong fills.
 *
 * Per account + symbol + side + price, pieces within ±2s (or sharing a
 * basketId) are one order. When history has the order, only history's volume
 * counts and every replay piece is dropped; within a source, pieces merge
 * into one fill with the summed size and the largest fill id. A history
 * cluster covers a replay cluster only when they share a basketId or either
 * has a row without one — distinct baskets were already reconciled per
 * order, and the per-order rule may have kept live for one and history for
 * the next.
 *
 * Run after `dedupeFills` so an exact re-delivery is not summed twice.
 */
export function consolidateOrderFills(
  fills: RithmicProtocolFill[],
  pieceWindowMs = RITHMIC_PROTOCOL_ORDER_PIECE_WINDOW_MS,
  crossSourceToleranceMs = RITHMIC_PROTOCOL_TIMESTAMP_TOLERANCE_MS,
): RithmicProtocolFill[] {
  const groups = new Map<string, RithmicProtocolFill[]>()
  for (const fill of fills) {
    const key = orderGroupKey(fill)
    const list = groups.get(key) ?? []
    list.push(fill)
    groups.set(key, list)
  }

  const out: RithmicProtocolFill[] = []
  for (const groupFills of groups.values()) {
    // A manual patch is not a piece of a plant order. Leave it intact so a
    // nearby same-price history fill cannot absorb its quantity.
    const manual = groupFills.filter((fill) => fill.source === 'manual')
    const history = groupFills.filter(
      (fill) => fill.source !== 'replay' && fill.source !== 'manual',
    )
    const replay = groupFills.filter((fill) => fill.source === 'replay')
    const historyClusters = clusterOneSource(history, pieceWindowMs)
    for (const cluster of historyClusters) out.push(mergeCluster(cluster))
    for (const fill of manual) out.push(fill)
    for (const cluster of clusterOneSource(replay, pieceWindowMs)) {
      const coveredByHistory = historyClusters.some(
        (h) =>
          cluster.startMs <= h.endMs + crossSourceToleranceMs &&
          cluster.endMs >= h.startMs - crossSourceToleranceMs &&
          clustersMayBeSameOrder(cluster, h),
      )
      if (!coveredByHistory) out.push(mergeCluster(cluster))
    }
  }

  // Keep the caller's order stable for FIFO tie-breaks.
  const rank = new Map(fills.map((fill, index) => [fill, index]))
  return out.sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0))
}

function plantOrderClusters(
  fills: RithmicProtocolFill[],
  piece: RithmicProtocolFill,
): OrderCluster[] {
  const key = orderGroupKey(piece)
  const sameGroup = fills.filter((fill) => {
    if (fill.source === 'manual' || fill.source === 'manual-retired') return false
    if (orderGroupKey(fill) !== key) return false
    if (piece.source === 'replay') return fill.source === 'replay'
    return fill.source !== 'replay'
  })
  return clusterOneSource(sameGroup, RITHMIC_PROTOCOL_ORDER_PIECE_WINDOW_MS)
}

/** The cluster that contains this row, not an earlier session that reused its fill id. */
function clusterForNamedPiece(
  fills: RithmicProtocolFill[],
  piece: RithmicProtocolFill,
): OrderCluster | null {
  const pieceId = canonicalRithmicFillId(piece.fillId)
  if (!pieceId) return null
  const namedMs = sourceTimestampMs(piece)
  for (const cluster of plantOrderClusters(fills, piece)) {
    const hit = cluster.fills.some((fill) => {
      if (canonicalRithmicFillId(fill.fillId) !== pieceId) return false
      const fillMs = sourceTimestampMs(fill)
      if (namedMs == null || fillMs == null) return namedMs == null && fillMs == null
      return fillMs === namedMs
    })
    if (hit) return cluster
  }
  return null
}

/**
 * Consolidated fill id of the order `piece` belongs to, using the same
 * basket and ±2s clustering as `consolidateOrderFills`. A piece in a chain
 * longer than 2s still maps to that order's id. A recycled fill id matches
 * the row with the same timestamp, not the earliest session.
 */
export function consolidatedFillIdForPiece(
  fills: RithmicProtocolFill[],
  piece: RithmicProtocolFill,
): string | null {
  const cluster = clusterForNamedPiece(fills, piece)
  if (!cluster) return null
  return canonicalRithmicFillId(mergeCluster(cluster).fillId) ?? null
}

/** Piece ids of the named row's order, including the consolidated id. */
export function orderMemberFillIds(
  fills: RithmicProtocolFill[],
  piece: RithmicProtocolFill,
): string[] {
  const cluster = clusterForNamedPiece(fills, piece)
  const ids = new Set<string>()
  const namedId = canonicalRithmicFillId(piece.fillId)
  if (namedId) ids.add(namedId)
  if (!cluster) return [...ids]
  for (const fill of cluster.fills) {
    const id = canonicalRithmicFillId(fill.fillId)
    if (id) ids.add(id)
  }
  const consolidated = canonicalRithmicFillId(mergeCluster(cluster).fillId)
  if (consolidated) ids.add(consolidated)
  return [...ids]
}

export type RithmicProtocolStoredLegRow = RithmicProtocolFillPairIdentity & {
  id?: string
  side?: string | null
  quantity?: number | null
  entryPrice?: string | null
  closePrice?: string | null
}

type Leg = {
  key: string
  direction: 'B' | 'S'
  price: number
  timeMs: number
  remaining: number
  fillId: string
}

function tradeLegs(row: RithmicProtocolStoredLegRow): [Leg, Leg] | null {
  const entryMs = parseIdentityTime(row.entryDate)
  const closeMs = parseIdentityTime(row.closeDate)
  const quantity = Math.abs(Number(row.quantity) || 0)
  const entryPrice = Number(row.entryPrice)
  const closePrice = Number(row.closePrice)
  if (
    entryMs == null ||
    closeMs == null ||
    !quantity ||
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(closePrice)
  ) {
    return null
  }
  const isLong = String(row.side ?? '').trim().toLowerCase() === 'long'
  const key = `${row.accountNumber ?? ''}|${row.instrument ?? ''}`
  return [
    {
      key,
      direction: isLong ? 'B' : 'S',
      price: entryPrice,
      timeMs: entryMs,
      remaining: quantity,
      fillId: canonicalRithmicFillId(row.entryId) ?? '',
    },
    {
      key,
      direction: isLong ? 'S' : 'B',
      price: closePrice,
      timeMs: closeMs,
      remaining: quantity,
      fillId: canonicalRithmicFillId(row.closeId) ?? '',
    },
  ]
}

function takeLeg(pool: Leg[], want: Leg, toleranceMs: number): Leg | undefined {
  return pool.find((leg) => {
    if (
      !(
        leg.remaining > 0 &&
        leg.key === want.key &&
        leg.direction === want.direction &&
        leg.price === want.price &&
        Math.abs(leg.timeMs - want.timeMs) <= toleranceMs
      )
    ) {
      return false
    }
    // A stored manual leg does not cover the plant fill that replaced it.
    // Otherwise the replacement round-trip is skipped and phantom reap
    // then deletes the only copy.
    if (
      leg.fillId.startsWith('manual-') &&
      want.fillId &&
      !want.fillId.startsWith('manual-') &&
      leg.fillId !== want.fillId
    ) {
      return false
    }
    return true
  })
}

/**
 * Drop incoming Protocol trades whose contracts are already stored, even
 * when the stored rows pair the fills differently (e.g. rows rebuilt from a
 * broker export, or saved before order pieces were consolidated). A trade is
 * covered when stored rows for the same account + instrument still have
 * unclaimed contracts at the same side, price and time (± tolerance) for both
 * its entry and its exit.
 *
 * Trades that already resolved to a same-size stored row are left alone
 * (createMany's skipDuplicates handles them) and claim that row's legs first.
 */
export function filterRithmicProtocolTradesCoveredByStoredRows<
  T extends RithmicProtocolStoredLegRow & { id: string },
>(
  incoming: T[],
  existingRows: Array<RithmicProtocolStoredLegRow & { id: string }>,
  toleranceMs = RITHMIC_PROTOCOL_TIMESTAMP_TOLERANCE_MS,
): { kept: T[]; skipped: T[] } {
  const existingById = new Map(existingRows.map((row) => [row.id, row]))
  const pool: Leg[] = []
  for (const row of existingRows) {
    const legs = tradeLegs(row)
    if (legs) pool.push(...legs)
  }
  const kept: T[] = []
  const skipped: T[] = []
  const pending: T[] = []
  for (const trade of incoming) {
    // Fill-pair matching ignores size, so a 5-lot can resolve to a stored
    // 2-lot piece. Only a same-size match is the same row; anything else is
    // checked for coverage (and skipped if covered, so the commission
    // backfill does not rewrite the smaller row).
    const match = existingById.get(trade.id)
    if (match && Number(match.quantity) === Number(trade.quantity)) {
      for (const want of tradeLegs(trade) ?? []) {
        const leg = takeLeg(pool, want, toleranceMs)
        if (leg) leg.remaining = Math.max(0, leg.remaining - want.remaining)
      }
      kept.push(trade)
    } else {
      pending.push(trade)
    }
  }
  for (const trade of pending) {
    const legs = tradeLegs(trade)
    if (!legs) {
      kept.push(trade)
      continue
    }
    const claims: Array<{ leg: Leg; qty: number }> = []
    let covered = true
    for (const want of legs) {
      let need = want.remaining
      while (need > 0) {
        const leg = takeLeg(pool, want, toleranceMs)
        if (!leg) break
        const qty = Math.min(need, leg.remaining)
        leg.remaining -= qty
        claims.push({ leg, qty })
        need -= qty
      }
      if (need > 0) {
        covered = false
        break
      }
    }
    if (covered) {
      skipped.push(trade)
    } else {
      for (const claim of claims) claim.leg.remaining += claim.qty
      kept.push(trade)
    }
  }
  return { kept, skipped }
}
