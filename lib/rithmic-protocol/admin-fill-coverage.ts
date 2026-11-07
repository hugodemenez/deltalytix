import {
  canonicalRithmicFillId,
  fillDayKey,
  fillIdentityKey,
  rithmicFillIdLookupValues,
} from './dedupe-fills'
import { fillSide, fillTimestampMs, normalizeInstrument } from './fills-to-trades'
import { parseTradeClockMs } from './opening-position'
import type { RithmicProtocolFill } from './types'

/** History vs replay of the same execution is documented up to ~10s on Lucid. */
const SPLIT_PIECE_WINDOW_MS = 10_000

export type AdminFillDropReason =
  | 'missing_symbol'
  | 'missing_price'
  | 'missing_size'
  | 'unknown_side'

export type AdminFillRowObservation = {
  accepted: boolean
  reason?: AdminFillDropReason
}

export type FillHistoryWindowStatus = 'ok' | 'no_data' | 'error' | 'capped'

export type AdminFillWindowCoverage = {
  startYmd: string
  endYmd: string
  historyFillCount: number
  historyStatus: FillHistoryWindowStatus
  fallbackFillCount: number
  fallbackStatus: 'ok' | 'failed' | 'skipped'
  fallbackDates: string[]
  resolved: boolean
  source: 'history' | 'order_history' | 'unresolved'
}

function decodedHasFillFields(decoded: {
  symbol?: string
  fillId?: string
  fillPrice?: number
  avgFillPrice?: number
  price?: number
  fillSize?: number | string
}): boolean {
  return Boolean(
    decoded.symbol ||
      decoded.fillId ||
      decoded.fillPrice != null ||
      decoded.avgFillPrice != null ||
      decoded.price != null ||
      decoded.fillSize != null,
  )
}

/** Terminator / no-data responses carry rp_code and no fill body. */
export function isFillHistoryControlRow(decoded: {
  rpCode?: unknown
  symbol?: string
  fillId?: string
  fillPrice?: number
  avgFillPrice?: number
  price?: number
  fillSize?: number | string
}): boolean {
  const rp = decoded.rpCode
  const hasRp = Array.isArray(rp) && rp.length > 0
  return hasRp && !decodedHasFillFields(decoded)
}

export function knownFillSide(transactionType: string | undefined): 'B' | 'S' | null {
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
  if (
    t === '2' ||
    t === '3' ||
    t === 'SELL' ||
    t === 'S' ||
    t === 'SLD' ||
    t === 'SHORT' ||
    t === 'SS'
  ) {
    return 'S'
  }
  return null
}

export function observeMappedFillRow(
  decoded: {
    rpCode?: unknown
    symbol?: string
    fillId?: string
    fillPrice?: number
    avgFillPrice?: number
    price?: number
    fillSize?: number | string
    transactionType?: string | number
  },
  accepted: boolean,
): AdminFillRowObservation {
  if (isFillHistoryControlRow(decoded) || !decodedHasFillFields(decoded)) {
    return { accepted: true }
  }
  if (accepted) {
    if (knownFillSide(String(decoded.transactionType ?? '')) == null) {
      return { accepted: false, reason: 'unknown_side' }
    }
    return { accepted: true }
  }
  if (!decoded.symbol) return { accepted: false, reason: 'missing_symbol' }
  const price = Number(
    decoded.fillPrice ?? decoded.avgFillPrice ?? decoded.price ?? NaN,
  )
  if (!Number.isFinite(price) || price === 0) {
    return { accepted: false, reason: 'missing_price' }
  }
  const size = Number(decoded.fillSize ?? 0)
  if (!Number.isFinite(size) || size <= 0) {
    return { accepted: false, reason: 'missing_size' }
  }
  if (knownFillSide(String(decoded.transactionType ?? '')) == null) {
    return { accepted: false, reason: 'unknown_side' }
  }
  return { accepted: true }
}

export function observeRawFill(fill: RithmicProtocolFill): AdminFillRowObservation {
  if (!fill.symbol) return { accepted: false, reason: 'missing_symbol' }
  const price = Number(fill.fillPrice || fill.avgFillPrice || 0)
  if (!Number.isFinite(price) || price === 0) {
    return { accepted: false, reason: 'missing_price' }
  }
  const size = Number(fill.fillSize || 0)
  if (!Number.isFinite(size) || size <= 0) {
    return { accepted: false, reason: 'missing_size' }
  }
  if (knownFillSide(fill.transactionType) == null) {
    return { accepted: false, reason: 'unknown_side' }
  }
  return { accepted: true }
}

export function tradeDayKey(iso: string | null | undefined): string {
  const ms = parseTradeClockMs(iso)
  if (ms == null) return ''
  const at = new Date(ms)
  return `${at.getUTCFullYear()}${String(at.getUTCMonth() + 1).padStart(2, '0')}${String(at.getUTCDate()).padStart(2, '0')}`
}

function numericFillId(fillId: string | null | undefined): number | null {
  const canonical = canonicalRithmicFillId(fillId)
  if (!canonical) return null
  if (!/^\d+$/.test(canonical)) return null
  return Number(canonical)
}

function timestampsWithin(leftMs: number, rightMs: number, windowMs: number): boolean {
  if (leftMs <= 0 || rightMs <= 0) return false
  return Math.abs(leftMs - rightMs) <= windowMs
}

function isLegacySplitPiece(params: {
  storedFillId: string | null | undefined
  storedTimeMs: number
  storedSide: 'B' | 'S' | null
  storedPrice: number
  storedQty: number
  upstream: RithmicProtocolFill
}): boolean {
  const storedNum = numericFillId(params.storedFillId)
  const upNum = numericFillId(params.upstream.fillId)
  if (storedNum == null || upNum == null) return false
  if (upNum < storedNum) return false
  const upSide = knownFillSide(params.upstream.transactionType)
  if (params.storedSide == null || upSide == null || params.storedSide !== upSide) {
    return false
  }
  const upPrice = Number(
    params.upstream.fillPrice || params.upstream.avgFillPrice || 0,
  )
  if (!(params.storedPrice > 0) || upPrice !== params.storedPrice) return false
  const upQty = Number(params.upstream.fillSize || 0)
  if (!(params.storedQty > 0) || upQty < params.storedQty) return false
  const upMs = fillTimestampMs(params.upstream)
  if (
    upMs > 0 &&
    params.storedTimeMs > 0 &&
    Math.abs(upMs - params.storedTimeMs) > SPLIT_PIECE_WINDOW_MS
  ) {
    return false
  }
  return true
}

function sameBookFingerprint(
  left: RithmicProtocolFill,
  right: RithmicProtocolFill,
): boolean {
  return (
    left.accountId === right.accountId &&
    (left.symbol || '').trim().toUpperCase() === (right.symbol || '').trim().toUpperCase() &&
    knownFillSide(left.transactionType) === knownFillSide(right.transactionType) &&
    Number(left.fillPrice || left.avgFillPrice || 0) ===
      Number(right.fillPrice || right.avgFillPrice || 0)
  )
}

type FillQtyPool = { fill: RithmicProtocolFill; remaining: number }

function fillQty(fill: RithmicProtocolFill): number {
  const size = Number(fill.fillSize || 0)
  return Number.isFinite(size) && size > 0 ? size : 0
}

function makeFillQtyPool(fills: RithmicProtocolFill[]): FillQtyPool[] {
  return fills.map((fill) => ({ fill, remaining: fillQty(fill) }))
}

function fillMatchesLeg(
  fill: RithmicProtocolFill,
  params: {
    fillId?: string | null
    date?: string | null
    instrument?: string | null
    accountNumber?: string | null
    side?: 'B' | 'S' | null
    price: number
    quantity: number
  },
): boolean {
  if (!(params.quantity > 0) || !(params.price > 0) || params.side == null) {
    return false
  }
  if (params.accountNumber && fill.accountId !== params.accountNumber) return false
  const instrument = normalizeInstrument(params.instrument ?? '')
  if (instrument && normalizeInstrument(fill.symbol) !== instrument) return false
  const fillSideKnown = knownFillSide(fill.transactionType)
  if (fillSideKnown !== params.side) return false
  const fillPrice = Number(fill.fillPrice || fill.avgFillPrice || 0)
  if (fillPrice !== params.price) return false
  const ids = new Set(rithmicFillIdLookupValues(params.fillId))
  if (ids.size === 0) return false
  const fillIds = rithmicFillIdLookupValues(fill.fillId)
  const idMatch = fillIds.some((id) => ids.has(id))
  const storedMs = parseTradeClockMs(params.date) ?? 0
  const fillMs = fillTimestampMs(fill)
  if (idMatch) {
    if (timestampsWithin(storedMs, fillMs, SPLIT_PIECE_WINDOW_MS)) return true
    const fillDay = fillDayKey(fill)
    const tradeDay = tradeDayKey(params.date)
    return Boolean(fillDay && tradeDay && fillDay === tradeDay)
  }
  return isLegacySplitPiece({
    storedFillId: params.fillId,
    storedTimeMs: storedMs,
    storedSide: params.side,
    storedPrice: params.price,
    storedQty: params.quantity,
    upstream: fill,
  })
}

function consumeLegFromPool(
  pool: FillQtyPool[],
  params: {
    fillId?: string | null
    date?: string | null
    instrument?: string | null
    accountNumber?: string | null
    side?: 'B' | 'S' | null
    price: number
    quantity: number
  },
): boolean {
  if (!(params.quantity > 0)) return false
  for (const slot of pool) {
    if (slot.remaining < params.quantity) continue
    if (!fillMatchesLeg(slot.fill, params)) continue
    slot.remaining -= params.quantity
    return true
  }
  return false
}

function storedFillMatchesUpstream(
  stored: RithmicProtocolFill,
  upstream: RithmicProtocolFill,
): boolean {
  if (fillIdentityKey(stored) === fillIdentityKey(upstream)) return true
  return (
    sameBookFingerprint(stored, upstream) &&
    isLegacySplitPiece({
      storedFillId: stored.fillId,
      storedTimeMs: fillTimestampMs(stored),
      storedSide: knownFillSide(stored.transactionType),
      storedPrice: Number(stored.fillPrice || stored.avgFillPrice || 0),
      storedQty: Number(stored.fillSize || 0),
      upstream,
    })
  )
}

/** Stored in-window fill is present upstream, including history rollups of split pieces. */
export function upstreamCoversStoredFill(
  stored: RithmicProtocolFill,
  upstreamRaw: RithmicProtocolFill[],
): boolean {
  return storedFillsMissingUpstream([stored], upstreamRaw).length === 0
}

export function storedFillsMissingUpstream(
  storedWindow: RithmicProtocolFill[],
  upstreamRaw: RithmicProtocolFill[],
): RithmicProtocolFill[] {
  const pool = makeFillQtyPool(upstreamRaw)
  const missing: RithmicProtocolFill[] = []
  for (const stored of storedWindow) {
    const qty = fillQty(stored)
    const slot = pool.find(
      (entry) => entry.remaining >= qty && storedFillMatchesUpstream(stored, entry.fill),
    )
    if (!slot || !(qty > 0)) {
      missing.push(stored)
      continue
    }
    slot.remaining -= qty
  }
  return missing
}

export function unstoredPreAnchorFills(
  incoming: RithmicProtocolFill[],
  stored: RithmicProtocolFill[],
  windowStartMs: number,
): RithmicProtocolFill[] {
  return incoming.filter((fill) => {
    const ms = fillTimestampMs(fill)
    if (ms <= 0 || ms >= windowStartMs) return false
    return !upstreamCoversStoredFill(fill, stored)
  })
}

export function fillsOnOrAfter(fills: RithmicProtocolFill[], startMs: number): RithmicProtocolFill[] {
  return fills.filter((fill) => {
    const ms = fillTimestampMs(fill)
    return ms > 0 && ms >= startMs
  })
}

/** Ordinary ShowFillHistory uses the trade-date index from this UTC day. */
export function fillsInOrdinaryFetchRange(
  fills: RithmicProtocolFill[],
  startMs: number,
  startYmd: string,
): RithmicProtocolFill[] {
  const startDay = ymdToYyyymmdd(startYmd)
  return fills.filter((fill) => {
    const ms = fillTimestampMs(fill)
    if (ms >= startMs) return true
    const day = fillDayKey(fill)
    return Boolean(day) && day >= startDay
  })
}

type TradeLegCoverParams = {
  accountNumber?: string | null
  instrument?: string | null
  side?: string | null
  quantity?: number | null
  entryDate?: string | null
  closeDate?: string | null
  entryId?: string | null
  closeId?: string | null
  entryPrice?: string | number | null
  closePrice?: string | number | null
}

function consumeTradeFromPool(trade: TradeLegCoverParams, pool: FillQtyPool[]): boolean {
  const long = String(trade.side ?? '').toLowerCase() !== 'short'
  const qty = Number(trade.quantity || 0)
  const entryPrice = Number(trade.entryPrice || 0)
  const closePrice = Number(trade.closePrice || 0)
  return (
    consumeLegFromPool(pool, {
      fillId: trade.entryId,
      date: trade.entryDate,
      instrument: trade.instrument,
      accountNumber: trade.accountNumber,
      side: long ? 'B' : 'S',
      price: entryPrice,
      quantity: qty,
    }) &&
    consumeLegFromPool(pool, {
      fillId: trade.closeId,
      date: trade.closeDate,
      instrument: trade.instrument,
      accountNumber: trade.accountNumber,
      side: long ? 'S' : 'B',
      price: closePrice,
      quantity: qty,
    })
  )
}

export function protocolTradeCoveredByRawFills(
  trade: TradeLegCoverParams,
  rawFills: RithmicProtocolFill[],
): boolean {
  return consumeTradeFromPool(trade, makeFillQtyPool(rawFills))
}

export function uncoveredTradesByFillIdentity<
  T extends {
    accountNumber?: string | null
    instrument?: string | null
    side?: string | null
    quantity?: number | null
    entryDate?: string | null
    closeDate?: string | null
    entryId?: string | null
    closeId?: string | null
    entryPrice?: string | number | null
    closePrice?: string | number | null
  },
>(existing: T[], rawFills: RithmicProtocolFill[]): T[] {
  const pool = makeFillQtyPool(rawFills)
  const ordered = [...existing].sort((left, right) => {
    const byTime =
      (parseTradeClockMs(left.entryDate) ?? 0) - (parseTradeClockMs(right.entryDate) ?? 0)
    if (byTime !== 0) return byTime
    return String(left.entryId ?? '').localeCompare(String(right.entryId ?? ''))
  })
  const uncovered: T[] = []
  for (const row of ordered) {
    if (!consumeTradeFromPool(row, pool)) uncovered.push(row)
  }
  return uncovered
}

export function fillDateYyyymmdd(fill: RithmicProtocolFill): string {
  return fillDayKey(fill)
}

export function ymdToYyyymmdd(ymd: string): string {
  return ymd.replace(/-/g, '')
}

export function yyyymmddInInclusiveRange(
  day: string,
  startYmd: string,
  endYmd: string,
): boolean {
  if (!/^\d{8}$/.test(day)) return false
  const start = ymdToYyyymmdd(startYmd)
  const end = ymdToYyyymmdd(endYmd)
  return day >= start && day <= end
}

function ymdList(values: string[] | undefined): string[] {
  return (values ?? [])
    .map((value) => value.replace(/-/g, ''))
    .filter((day) => /^\d{8}$/.test(day))
}

function eachYmdInclusive(startYmd: string, endYmd: string): string[] {
  const start = ymdToYyyymmdd(startYmd)
  const end = ymdToYyyymmdd(endYmd)
  if (!/^\d{8}$/.test(start) || !/^\d{8}$/.test(end) || start > end) return []
  const days: string[] = []
  const cursor = new Date(
    Date.UTC(Number(start.slice(0, 4)), Number(start.slice(4, 6)) - 1, Number(start.slice(6, 8))),
  )
  const last = new Date(
    Date.UTC(Number(end.slice(0, 4)), Number(end.slice(4, 6)) - 1, Number(end.slice(6, 8))),
  )
  while (cursor.getTime() <= last.getTime() && days.length < 400) {
    days.push(toHyphenYmd(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

function toHyphenYmd(instant: Date): string {
  return `${instant.getUTCFullYear()}-${String(instant.getUTCMonth() + 1).padStart(2, '0')}-${String(instant.getUTCDate()).padStart(2, '0')}`
}

/** Order-history retention reaches the window start (min date ≤ start). */
export function retentionReachesWindowStart(
  dates: string[] | undefined,
  startYmd: string,
): boolean {
  const normalized = ymdList(dates)
  if (normalized.length === 0 || !startYmd) return false
  const start = ymdToYyyymmdd(startYmd)
  return normalized.every((day) => /^\d{8}$/.test(day)) && Math.min(...normalized.map(Number)) <= Number(start)
}

function everyWindowDayHasEvidence(
  startYmd: string,
  endYmd: string,
  dates: string[] | undefined,
  fillDays: string[] | undefined,
): boolean {
  const covered = new Set([...ymdList(dates), ...ymdList(fillDays)])
  if (covered.size === 0) return false
  return eachYmdInclusive(startYmd, endYmd).every((day) => covered.has(ymdToYyyymmdd(day)))
}

export function windowResolvedAfterFallback(window: {
  historyStatus: FillHistoryWindowStatus
  historyFillCount: number
  fallbackStatus: 'ok' | 'failed' | 'skipped'
  fallbackFillCount: number
  fallbackDates?: string[]
  fallbackFillDays?: string[]
  startYmd?: string
  endYmd?: string
  todayYmd?: string
}): { resolved: boolean; source: AdminFillWindowCoverage['source'] } {
  if (window.historyStatus === 'capped' || window.historyStatus === 'error') {
    return { resolved: false, source: 'unresolved' }
  }
  if (window.historyStatus === 'ok') {
    return { resolved: true, source: 'history' }
  }
  // Future / not-yet-started UTC days have no session: treat as empty.
  // Quiet historical no-data windows still need retention or per-day evidence.
  if (
    window.startYmd &&
    window.todayYmd &&
    window.startYmd > window.todayYmd
  ) {
    return { resolved: true, source: 'history' }
  }
  if (window.fallbackStatus !== 'ok' || !window.startYmd || !window.endYmd) {
    return { resolved: false, source: 'unresolved' }
  }
  if (retentionReachesWindowStart(window.fallbackDates, window.startYmd)) {
    return { resolved: true, source: 'order_history' }
  }
  if (
    everyWindowDayHasEvidence(
      window.startYmd,
      window.endYmd,
      window.fallbackDates,
      window.fallbackFillDays,
    )
  ) {
    return { resolved: true, source: 'order_history' }
  }
  return { resolved: false, source: 'unresolved' }
}

/** True when a resolved window's dates actually include `ymd`. */
export function coverageIncludesYmd(params: {
  coverage: AdminFillWindowCoverage[]
  ymd: string
}): boolean {
  const wanted = ymdToYyyymmdd(params.ymd)
  return params.coverage.some(
    (window) =>
      window.resolved &&
      ymdToYyyymmdd(window.startYmd) <= wanted &&
      ymdToYyyymmdd(window.endYmd) >= wanted,
  )
}

export function coverageReachesAnchor(params: {
  coverage: AdminFillWindowCoverage[]
  historyStartYmd: string
}): boolean {
  return coverageIncludesYmd({
    coverage: params.coverage,
    ymd: params.historyStartYmd,
  })
}

export type OrdinarySyncTradeRef = {
  instrument?: string | null
  side?: string | null
  quantity?: number | null
  entryId?: string | null
  closeId?: string | null
  entryDate?: string | null
  closeDate?: string | null
  entryPrice?: string | number | null
  closePrice?: string | number | null
}

export function rebuildTradeFingerprint(trade: OrdinarySyncTradeRef): string {
  return [
    trade.instrument ?? '',
    trade.side ?? '',
    String(trade.quantity ?? ''),
    canonicalRithmicFillId(trade.entryId) ?? '',
    canonicalRithmicFillId(trade.closeId) ?? '',
    trade.entryDate ?? '',
    trade.closeDate ?? '',
    String(trade.entryPrice ?? ''),
    String(trade.closePrice ?? ''),
  ].join('|')
}

export function inWindowDerivedTrades<T extends OrdinarySyncTradeRef>(
  trades: T[],
  windowStartMs: number,
): T[] {
  return trades.filter((trade) => {
    const closeMs = parseTradeClockMs(trade.closeDate)
    const entryMs = parseTradeClockMs(trade.entryDate)
    const ts = closeMs ?? entryMs
    if (ts == null) return false
    return ts >= windowStartMs
  })
}

export function ordinarySyncTradesMatchRebuild(
  ordinaryInWindow: OrdinarySyncTradeRef[],
  rebuildTrades: OrdinarySyncTradeRef[],
): boolean {
  if (ordinaryInWindow.length !== rebuildTrades.length) return false
  const left = ordinaryInWindow.map(rebuildTradeFingerprint).sort()
  const right = rebuildTrades.map(rebuildTradeFingerprint).sort()
  return left.every((key, index) => key === right[index])
}

export type ResidualOpenLot = {
  instrument: string
  side: 'B' | 'S'
  price: number
  timestampMs: number
  orderId: string
  quantity: number
}

function lotFingerprint(lot: ResidualOpenLot): string {
  return [
    lot.instrument,
    lot.side,
    String(lot.price),
    String(lot.timestampMs),
    lot.orderId,
    String(lot.quantity),
  ].join('|')
}

export function fifoTimestampTieExists(fills: RithmicProtocolFill[]): boolean {
  const seen = new Map<number, number>()
  for (const fill of fills) {
    const ms = fillTimestampMs(fill)
    if (ms <= 0) continue
    seen.set(ms, (seen.get(ms) ?? 0) + 1)
    if ((seen.get(ms) ?? 0) > 1) return true
  }
  return false
}

function sortFillsForFifo(
  fills: RithmicProtocolFill[],
  reverseTies: boolean,
): RithmicProtocolFill[] {
  return fills
    .map((fill, index) => ({ fill, index }))
    .sort((a, b) => {
      const byTime = fillTimestampMs(a.fill) - fillTimestampMs(b.fill)
      if (byTime !== 0) return byTime
      return reverseTies ? b.index - a.index : a.index - b.index
    })
    .map((row) => row.fill)
}

function uniformSideAndPrice(fills: RithmicProtocolFill[]): boolean {
  if (fills.length <= 1) return true
  const side = knownFillSide(fills[0]?.transactionType)
  const price = Number(fills[0]?.fillPrice || fills[0]?.avgFillPrice || 0)
  if (side == null || !(price > 0)) return false
  return fills.every(
    (fill) =>
      knownFillSide(fill.transactionType) === side &&
      Number(fill.fillPrice || fill.avgFillPrice || 0) === price,
  )
}

function bookHasMaterialTimestampTie(fills: RithmicProtocolFill[]): boolean {
  const groups = new Map<number, RithmicProtocolFill[]>()
  for (const fill of fills) {
    const ms = fillTimestampMs(fill)
    if (ms <= 0) continue
    const group = groups.get(ms) ?? []
    group.push(fill)
    groups.set(ms, group)
  }
  return [...groups.values()].some((group) => group.length > 1 && !uniformSideAndPrice(group))
}

function fifoOutcomeFingerprint(fills: RithmicProtocolFill[]): string {
  const closed: string[] = []
  type Lot = ResidualOpenLot
  const books = new Map<string, { longs: Lot[]; shorts: Lot[] }>()
  const sorted = fills
    .map((fill, index) => ({ fill, index }))
    .sort((a, b) => {
      const byTime = fillTimestampMs(a.fill) - fillTimestampMs(b.fill)
      if (byTime !== 0) return byTime
      return a.index - b.index
    })
  for (const { fill } of sorted) {
    const side = knownFillSide(fill.transactionType) ?? fillSide(fill.transactionType)
    const instrument = normalizeInstrument(fill.symbol)
    const quantity = Math.abs(Number(fill.fillSize) || 0)
    const price = Number(fill.fillPrice || fill.avgFillPrice || 0)
    if (!instrument || !quantity || !price) continue
    const incoming: Lot = {
      instrument,
      side,
      price,
      timestampMs: fillTimestampMs(fill),
      orderId: canonicalRithmicFillId(fill.fillId) ?? `${fill.sequenceNumber ?? 'fill'}`,
      quantity,
    }
    const key = `${fill.accountId}|${instrument}`
    const book = books.get(key) ?? { longs: [], shorts: [] }
    const opposite = side === 'B' ? book.shorts : book.longs
    const same = side === 'B' ? book.longs : book.shorts
    while (incoming.quantity > 0 && opposite.length > 0) {
      const open = opposite[0]
      const matched = Math.min(incoming.quantity, open.quantity)
      closed.push(
        [
          instrument,
          open.side,
          open.orderId,
          incoming.orderId,
          String(matched),
          String(open.price),
          String(incoming.price),
        ].join('|'),
      )
      open.quantity -= matched
      incoming.quantity -= matched
      if (open.quantity <= 0) opposite.shift()
    }
    if (incoming.quantity > 0) same.push(incoming)
    books.set(key, book)
  }
  const lots: ResidualOpenLot[] = []
  for (const book of books.values()) lots.push(...book.longs, ...book.shorts)
  return [...closed.sort(), ...lots.map(lotFingerprint).sort()].join('~')
}

/**
 * Refuse timestamp ties only when reversing same-ms fills in a rebuilt
 * instrument book would change closed pairs or residual lots. Same-side
 * same-price ties are harmless.
 */
export function fifoTieChangesOutcome(
  fills: RithmicProtocolFill[],
  options?: { fromMs?: number; instruments?: Iterable<string> },
): boolean {
  const allowed = options?.instruments
    ? new Set(
        [...options.instruments].map((value) => value.trim().toUpperCase()).filter(Boolean),
      )
    : null
  const scoped = fills.filter((fill) => {
    const instrument = normalizeInstrument(fill.symbol)
    if (!instrument) return false
    if (allowed && !allowed.has(instrument)) return false
    const ms = fillTimestampMs(fill)
    if (ms <= 0) return false
    if (options?.fromMs != null && ms < options.fromMs) return false
    return true
  })
  const books = new Map<string, RithmicProtocolFill[]>()
  for (const fill of scoped) {
    const key = `${fill.accountId}|${normalizeInstrument(fill.symbol)}`
    const book = books.get(key) ?? []
    book.push(fill)
    books.set(key, book)
  }
  for (const book of books.values()) {
    if (!bookHasMaterialTimestampTie(book)) continue
    const forward = sortFillsForFifo(book, false)
    const reversed = sortFillsForFifo(book, true)
    if (fifoOutcomeFingerprint(forward) !== fifoOutcomeFingerprint(reversed)) {
      return true
    }
  }
  return false
}

/**
 * Admin-only residual lots after the same instrument-book FIFO ordinary sync
 * uses. Not imported by ordinary callers.
 */
export function residualOpenLots(fills: RithmicProtocolFill[]): ResidualOpenLot[] {
  type Lot = ResidualOpenLot
  const books = new Map<string, { longs: Lot[]; shorts: Lot[] }>()
  const sorted = fills
    .map((fill, index) => ({ fill, index }))
    .sort((a, b) => {
      const byTime = fillTimestampMs(a.fill) - fillTimestampMs(b.fill)
      if (byTime !== 0) return byTime
      const aId = canonicalRithmicFillId(a.fill.fillId) ?? ''
      const bId = canonicalRithmicFillId(b.fill.fillId) ?? ''
      if (aId !== bId) return aId.localeCompare(bId)
      return fillIdentityKey(a.fill).localeCompare(fillIdentityKey(b.fill)) || a.index - b.index
    })
  for (const { fill } of sorted) {
    const side = knownFillSide(fill.transactionType) ?? fillSide(fill.transactionType)
    const instrument = normalizeInstrument(fill.symbol)
    const quantity = Math.abs(Number(fill.fillSize) || 0)
    const price = Number(fill.fillPrice || fill.avgFillPrice || 0)
    if (!instrument || !quantity || !price) continue
    const incoming: Lot = {
      instrument,
      side,
      price,
      timestampMs: fillTimestampMs(fill),
      orderId: canonicalRithmicFillId(fill.fillId) ?? `${fill.sequenceNumber ?? 'fill'}`,
      quantity,
    }
    const key = `${fill.accountId}|${instrument}`
    const book = books.get(key) ?? { longs: [], shorts: [] }
    const opposite = side === 'B' ? book.shorts : book.longs
    const same = side === 'B' ? book.longs : book.shorts
    while (incoming.quantity > 0 && opposite.length > 0) {
      const open = opposite[0]
      const matched = Math.min(incoming.quantity, open.quantity)
      open.quantity -= matched
      incoming.quantity -= matched
      if (open.quantity <= 0) opposite.shift()
    }
    if (incoming.quantity > 0) same.push(incoming)
    books.set(key, book)
  }
  const lots: ResidualOpenLot[] = []
  for (const book of books.values()) {
    lots.push(...book.longs, ...book.shorts)
  }
  return lots
}

export function residualOpenLotsMatch(
  left: ResidualOpenLot[],
  right: ResidualOpenLot[],
): boolean {
  if (left.length !== right.length) return false
  const a = left.map(lotFingerprint).sort()
  const b = right.map(lotFingerprint).sort()
  return a.every((key, index) => key === b[index])
}
