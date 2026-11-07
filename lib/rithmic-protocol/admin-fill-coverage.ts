import {
  canonicalRithmicFillId,
  fillDayKey,
  fillIdentityKey,
  rithmicFillIdLookupValues,
} from './dedupe-fills'
import { fillTimestampMs, normalizeInstrument } from './fills-to-trades'
import { parseTradeClockMs } from './opening-position'
import type { RithmicProtocolFill } from './types'

const SPLIT_PIECE_WINDOW_MS = 2_000

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
  resolved: boolean
  source: 'history' | 'order_history' | 'unresolved'
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
    symbol?: string
    fillPrice?: number
    avgFillPrice?: number
    price?: number
    fillSize?: number | string
    transactionType?: string | number
  },
  accepted: boolean,
): AdminFillRowObservation {
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
  return { accepted: false, reason: 'missing_symbol' }
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

function isLegacySplitPiece(
  storedFillId: string | null | undefined,
  storedTimeMs: number,
  upstream: RithmicProtocolFill,
): boolean {
  const storedNum = numericFillId(storedFillId)
  const upNum = numericFillId(upstream.fillId)
  if (storedNum == null || upNum == null) return false
  if (upNum < storedNum) return false
  const upMs = fillTimestampMs(upstream)
  if (upMs > 0 && storedTimeMs > 0 && Math.abs(upMs - storedTimeMs) > SPLIT_PIECE_WINDOW_MS) {
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
      isLegacySplitPiece(stored.fillId, storedMs, fill),
  )
}

export function storedFillsMissingUpstream(
  storedWindow: RithmicProtocolFill[],
  upstreamRaw: RithmicProtocolFill[],
): RithmicProtocolFill[] {
  return storedWindow.filter((fill) => !upstreamCoversStoredFill(fill, upstreamRaw))
}

function legCoveredByRawFills(params: {
  fillId?: string | null
  date?: string | null
  instrument?: string | null
  accountNumber?: string | null
  fills: RithmicProtocolFill[]
}): boolean {
  const ids = new Set(rithmicFillIdLookupValues(params.fillId))
  if (ids.size === 0) return false
  const day = tradeDayKey(params.date)
  const instrument = normalizeInstrument(params.instrument ?? '')
  const account = params.accountNumber ?? ''
  const storedMs = parseTradeClockMs(params.date) ?? 0
  return params.fills.some((fill) => {
    if (account && fill.accountId !== account) return false
    if (instrument && normalizeInstrument(fill.symbol) !== instrument) return false
    const fillDay = fillDayKey(fill)
    if (day && fillDay && fillDay !== day) return false
    const fillIds = rithmicFillIdLookupValues(fill.fillId)
    if (fillIds.some((id) => ids.has(id))) return true
    return isLegacySplitPiece(params.fillId, storedMs, fill)
  })
}

export function protocolTradeCoveredByRawFills(
  trade: {
    accountNumber?: string | null
    instrument?: string | null
    entryDate?: string | null
    closeDate?: string | null
    entryId?: string | null
    closeId?: string | null
  },
  rawFills: RithmicProtocolFill[],
): boolean {
  return (
    legCoveredByRawFills({
      fillId: trade.entryId,
      date: trade.entryDate,
      instrument: trade.instrument,
      accountNumber: trade.accountNumber,
      fills: rawFills,
    }) &&
    legCoveredByRawFills({
      fillId: trade.closeId,
      date: trade.closeDate,
      instrument: trade.instrument,
      accountNumber: trade.accountNumber,
      fills: rawFills,
    })
  )
}

export function uncoveredTradesByFillIdentity<
  T extends {
    accountNumber?: string | null
    instrument?: string | null
    entryDate?: string | null
    closeDate?: string | null
    entryId?: string | null
    closeId?: string | null
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

export function windowResolvedAfterFallback(window: {
  historyStatus: FillHistoryWindowStatus
  historyFillCount: number
  fallbackStatus: 'ok' | 'failed' | 'skipped'
  fallbackFillCount: number
}): { resolved: boolean; source: AdminFillWindowCoverage['source'] } {
  if (window.historyStatus === 'capped' || window.historyStatus === 'error') {
    return { resolved: false, source: 'unresolved' }
  }
  if (window.historyStatus === 'ok' && window.historyFillCount > 0) {
    return { resolved: true, source: 'history' }
  }
  if (window.historyStatus === 'ok' && window.fallbackStatus === 'skipped') {
    return { resolved: true, source: 'history' }
  }
  if (window.fallbackStatus === 'ok') {
    return {
      resolved: true,
      source: window.fallbackFillCount > 0 ? 'order_history' : 'history',
    }
  }
  if (window.historyStatus === 'no_data') {
    return { resolved: false, source: 'unresolved' }
  }
  return { resolved: window.historyStatus === 'ok', source: 'history' }
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
