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
  return { accepted: false, reason: 'unknown_side' }
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

/** Stored in-window fill is present upstream, including history rollups of split pieces. */
export function upstreamCoversStoredFill(
  stored: RithmicProtocolFill,
  upstreamRaw: RithmicProtocolFill[],
): boolean {
  const key = fillIdentityKey(stored)
  if (upstreamRaw.some((fill) => fillIdentityKey(fill) === key)) return true
  const storedMs = fillTimestampMs(stored)
  return upstreamRaw.some(
    (fill) =>
      sameBookFingerprint(stored, fill) &&
      isLegacySplitPiece({
        storedFillId: stored.fillId,
        storedTimeMs: storedMs,
        storedSide: knownFillSide(stored.transactionType),
        storedPrice: Number(stored.fillPrice || stored.avgFillPrice || 0),
        storedQty: Number(stored.fillSize || 0),
        upstream: fill,
      }),
  )
}

export function storedFillsMissingUpstream(
  storedWindow: RithmicProtocolFill[],
  upstreamRaw: RithmicProtocolFill[],
): RithmicProtocolFill[] {
  return storedWindow.filter((fill) => !upstreamCoversStoredFill(fill, upstreamRaw))
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

function legCoveredByRawFills(params: {
  fillId?: string | null
  date?: string | null
  instrument?: string | null
  accountNumber?: string | null
  side?: 'B' | 'S' | null
  price?: number
  quantity?: number
  fills: RithmicProtocolFill[]
}): boolean {
  const ids = new Set(rithmicFillIdLookupValues(params.fillId))
  if (ids.size === 0) return false
  const instrument = normalizeInstrument(params.instrument ?? '')
  const account = params.accountNumber ?? ''
  const storedMs = parseTradeClockMs(params.date) ?? 0
  const storedPrice = Number(params.price || 0)
  const storedQty = Number(params.quantity || 0)
  return params.fills.some((fill) => {
    if (account && fill.accountId !== account) return false
    if (instrument && normalizeInstrument(fill.symbol) !== instrument) return false
    const fillIds = rithmicFillIdLookupValues(fill.fillId)
    const idMatch = fillIds.some((id) => ids.has(id))
    const fillMs = fillTimestampMs(fill)
    if (idMatch) {
      if (timestampsWithin(storedMs, fillMs, SPLIT_PIECE_WINDOW_MS)) return true
      const fillDay = fillDayKey(fill)
      const tradeDay = tradeDayKey(params.date)
      if (fillDay && tradeDay && fillDay === tradeDay) return true
      return false
    }
    return isLegacySplitPiece({
      storedFillId: params.fillId,
      storedTimeMs: storedMs,
      storedSide: params.side ?? null,
      storedPrice,
      storedQty: storedQty || Number(fill.fillSize || 0),
      upstream: fill,
    })
  })
}

export function protocolTradeCoveredByRawFills(
  trade: {
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
  rawFills: RithmicProtocolFill[],
): boolean {
  const long = String(trade.side ?? '').toLowerCase() !== 'short'
  const qty = Number(trade.quantity || 0)
  return (
    legCoveredByRawFills({
      fillId: trade.entryId,
      date: trade.entryDate,
      instrument: trade.instrument,
      accountNumber: trade.accountNumber,
      side: long ? 'B' : 'S',
      price: Number(trade.entryPrice || 0),
      quantity: qty,
      fills: rawFills,
    }) &&
    legCoveredByRawFills({
      fillId: trade.closeId,
      date: trade.closeDate,
      instrument: trade.instrument,
      accountNumber: trade.accountNumber,
      side: long ? 'S' : 'B',
      price: Number(trade.closePrice || 0),
      quantity: qty,
      fills: rawFills,
    })
  )
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
  return existing.filter((row) => !protocolTradeCoveredByRawFills(row, rawFills))
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

function fallbackDatesCoverWindow(
  dates: string[] | undefined,
  startYmd: string,
  endYmd: string,
): boolean {
  if (!dates || dates.length === 0) return false
  return dates.some((date) =>
    yyyymmddInInclusiveRange(date.replace(/-/g, ''), startYmd, endYmd),
  )
}

export function windowResolvedAfterFallback(window: {
  historyStatus: FillHistoryWindowStatus
  historyFillCount: number
  fallbackStatus: 'ok' | 'failed' | 'skipped'
  fallbackFillCount: number
  fallbackDates?: string[]
  startYmd?: string
  endYmd?: string
}): { resolved: boolean; source: AdminFillWindowCoverage['source'] } {
  if (window.historyStatus === 'capped' || window.historyStatus === 'error') {
    return { resolved: false, source: 'unresolved' }
  }
  if (window.historyStatus === 'ok') {
    return { resolved: true, source: 'history' }
  }
  const datesCover =
    window.startYmd && window.endYmd
      ? fallbackDatesCoverWindow(window.fallbackDates, window.startYmd, window.endYmd)
      : false
  if (window.fallbackStatus === 'ok' && window.fallbackFillCount > 0) {
    return { resolved: true, source: 'order_history' }
  }
  if (window.fallbackStatus === 'ok' && datesCover) {
    return { resolved: true, source: 'order_history' }
  }
  return { resolved: false, source: 'unresolved' }
}

export function coverageReachesAnchor(params: {
  coverage: AdminFillWindowCoverage[]
  historyStartYmd: string
}): boolean {
  const first = params.coverage[0]
  if (!first) return false
  if (first.startYmd !== params.historyStartYmd) return false
  return first.resolved === true
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
