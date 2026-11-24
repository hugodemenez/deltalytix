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
 * Sunday evening open) rolled to Monday. Matches the plant's `fill_date`.
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

/** A live fill on the same side within the tolerance — history at that moment restates or rolls it up. */
function hasNearbyLiveSameSide(
  fill: RithmicProtocolFill,
  live: RithmicProtocolFill[],
  toleranceMs: number,
): boolean {
  const side = identitySide(fill.transactionType)
  const ms = sourceTimestampMs(fill)
  return live.some((row) => {
    if (identitySide(row.transactionType) !== side) return false
    const rowMs = sourceTimestampMs(row)
    if (ms == null || rowMs == null) return true
    return Math.abs(ms - rowMs) <= toleranceMs
  })
}

export type HistoryPreferenceDecision = {
  accountId: string
  symbol: string
  tradeDate: string
  /** Set when the decision was made per order (shared `basketId`). */
  basketId?: string
  historyFills: number
  liveFills: number
  /** Which source's rows were kept. */
  kept: 'history' | 'live'
  /** Date fallback, live won: history fills kept because no same-side live fill is near them. */
  historyBackfilled: number
}

function totalSize(fills: RithmicProtocolFill[]): number {
  return fills.reduce((sum, fill) => sum + Math.abs(Number(fill.fillSize) || 0), 0)
}

/**
 * One order seen by both sources: keep the larger filled size (a partial
 * report never wins), then the version with more pieces (real executions at
 * real prices, not a rollup), then history (settled record).
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

function orderKey(fill: RithmicProtocolFill, tradeDate: string): string | null {
  const basketId = (fill.basketId ?? '').trim()
  if (!basketId) return null
  return `${bookDateKey(fill, tradeDate)}|${identitySide(fill.transactionType)}|${basketId}`
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
 * 1. Per order (same account, symbol, trade date, side and `basketId`): when
 *    both sources have it, keep the larger filled size, then the source with
 *    more pieces — the real executions at their real prices — then history
 *    (settled record). Orders seen by only one source are always kept. Every prod
 *    ledger row carries a basketId, and on every order both sources had, side
 *    and total size agreed (2026-11-24 fleet scan, 232 orders).
 * 2. Rows without a basketId fall back to a per-trade-date rule: keep history
 *    when it restates every live fill (same side and price within the
 *    tolerance, quantity pooled); otherwise keep live, plus history fills with
 *    no same-side live fill nearby (executions live never saw).
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
  const decisions: HistoryPreferenceDecision[] = []
  const orders = new Map<
    string,
    { history: RithmicProtocolFill[]; live: RithmicProtocolFill[]; tradeDate: string }
  >()
  const dateGroups = new Map<
    string,
    { history: RithmicProtocolFill[]; live: RithmicProtocolFill[]; tradeDate: string }
  >()
  for (const fill of fills) {
    if (fill.source !== 'replay' && fill.source !== 'history') continue
    const tradeDate = fillTradeDateKey(fill)
    const order = orderKey(fill, tradeDate)
    const groups = order ? orders : dateGroups
    const key = order ?? bookDateKey(fill, tradeDate)
    const group = groups.get(key) ?? { history: [], live: [], tradeDate }
    if (fill.source === 'replay') group.live.push(fill)
    else group.history.push(fill)
    groups.set(key, group)
  }

  for (const [key, group] of orders) {
    if (group.history.length === 0 || group.live.length === 0) continue
    const keepHistory = historyWinsOrder(group.history, group.live)
    for (const fill of keepHistory ? group.live : group.history) dropped.add(fill)
    const first = group.history[0]
    decisions.push({
      accountId: first.accountId || 'unknown',
      symbol: (first.symbol ?? '').trim().toUpperCase(),
      tradeDate: group.tradeDate,
      basketId: key.slice(key.lastIndexOf('|') + 1),
      historyFills: group.history.length,
      liveFills: group.live.length,
      kept: keepHistory ? 'history' : 'live',
      historyBackfilled: 0,
    })
  }

  for (const group of dateGroups.values()) {
    if (group.history.length === 0 || group.live.length === 0) continue
    // Undated rows cannot be compared per trade date; keep both.
    if (!group.tradeDate) continue
    const keepHistory = historyRestatesLive(group.history, group.live, toleranceMs)
    let backfilled = 0
    if (keepHistory) {
      for (const fill of group.live) dropped.add(fill)
    } else {
      for (const fill of group.history) {
        if (!hasNearbyLiveSameSide(fill, group.live, toleranceMs)) {
          backfilled += 1
          continue
        }
        dropped.add(fill)
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
  return { fills: fills.filter((fill) => !dropped.has(fill)), decisions }
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

/** Pieces of one order land within this window of each other in one source. */
export const RITHMIC_PROTOCOL_ORDER_PIECE_WINDOW_MS = 2 * 1000

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
 * Rithmic reports one order differently per source: ShowFillHistory can roll
 * the partials up under the last fill id with the order's total size
 * (1245663 ×5), while ReplayExecutions sends each piece (1245660 ×1 …
 * 1245663 ×2). Mixing them mis-sized orders (too many or too few contracts),
 * left lots open and paired them with the wrong fills.
 *
 * Per account + symbol + side + price, pieces within ±2s (or sharing a
 * basketId) are one order. When history has the order, only history's volume
 * counts and every replay piece is dropped; within a source, pieces merge
 * into one fill with the summed size and the largest fill id.
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
          cluster.endMs >= h.startMs - crossSourceToleranceMs,
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
