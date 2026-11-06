import {
  OPENING_SEED_ORDER_ID_PREFIX,
  RITHMIC_PROTOCOL_OPENING_SEED_TAG,
  RITHMIC_PROTOCOL_TRADE_TAG,
  isOpeningSeedCloseTrade,
} from '@/lib/trade-id-utils'
import { canonicalRithmicFillId } from './dedupe-fills'
import { fillSide, fillTimestampMs, normalizeInstrument } from './fills-to-trades'
import type { RithmicProtocolFill } from './types'

export {
  OPENING_SEED_ORDER_ID_PREFIX,
  RITHMIC_PROTOCOL_OPENING_SEED_TAG,
  isOpeningSeedCloseTrade,
}

export type InstrumentPosition = {
  accountId: string
  symbol: string
  netQuantity: number
}

export type OpeningPositionCheck = {
  accountId: string
  symbol: string
  instrument: string
  /** Live broker net for this exact symbol. 0 when the snapshot omits it. */
  pEnd: number
  /** Signed fill net in the FIFO stream (`BUY` +, `SELL` −). */
  net: number
  /** Opening at the start of that stream: P_end − net(fills). */
  p0: number
  fillCount: number
}

export type OpeningLotSeed = {
  accountId: string
  symbol: string
  /** Signed: +long / −short, same convention as broker `net_quantity`. */
  netQuantity: number
  timestampMs: number
  orderId: string
}

function signedFillSize(fill: RithmicProtocolFill): number {
  const quantity = Math.abs(Number(fill.fillSize) || 0)
  return fillSide(fill.transactionType) === 'B' ? quantity : -quantity
}

export function openingPositionKey(accountId: string, symbol: string): string {
  return `${accountId}|${symbol.trim().toUpperCase()}`
}

function positionKey(accountId: string, symbol: string): string {
  return openingPositionKey(accountId, symbol)
}

export type CapturedPositionSnapshot = {
  positions: InstrumentPosition[]
  complete: boolean
  reason?: string
  capturedAtMs?: number
}

export type OpeningSeedSkipReason =
  | 'p0_exceeds_window_gross'
  | 'non_integer_p0'
  | 'unpriceable_close'

export type OpeningSeedSkip = {
  accountId: string
  symbol: string
  reason: OpeningSeedSkipReason
}

export type BracketedSnapshotResult = {
  ok: boolean
  positions: InstrumentPosition[]
  reason?: string
}

function positionNetMap(positions: InstrumentPosition[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const position of positions) {
    const accountId = position.accountId.trim()
    const symbol = position.symbol.trim().toUpperCase()
    if (!accountId || !symbol) continue
    const key = positionKey(accountId, symbol)
    map.set(key, (map.get(key) ?? 0) + position.netQuantity)
  }
  return map
}

/** Missing symbols count as flat (0) so omit vs explicit 0 is equal. */
export function instrumentPositionMapsEqual(
  left: InstrumentPosition[],
  right: InstrumentPosition[],
): boolean {
  const a = positionNetMap(left)
  const b = positionNetMap(right)
  const keys = new Set([...a.keys(), ...b.keys()])
  for (const key of keys) {
    if ((a.get(key) ?? 0) !== (b.get(key) ?? 0)) return false
  }
  return true
}

export function latestFillTimestampMs(fills: RithmicProtocolFill[]): number {
  let latest = 0
  for (const fill of fills) {
    const ts = fillTimestampMs(fill)
    if (ts > latest) latest = ts
  }
  return latest
}

/**
 * Snapshot before fills, snapshot after. Either incomplete, a position-map
 * mismatch, or a fill timestamp after the after-snapshot clock means P_0
 * cannot be trusted — treat as POSITION_SNAPSHOT_UNAVAILABLE.
 */
export function reconcileBracketedSnapshots(params: {
  before: CapturedPositionSnapshot
  after: CapturedPositionSnapshot
  fills: RithmicProtocolFill[]
}): BracketedSnapshotResult {
  if (!params.before.complete) {
    return {
      ok: false,
      positions: [],
      reason: params.before.reason ?? 'before_incomplete',
    }
  }
  if (!params.after.complete) {
    return {
      ok: false,
      positions: [],
      reason: params.after.reason ?? 'after_incomplete',
    }
  }
  if (!instrumentPositionMapsEqual(params.before.positions, params.after.positions)) {
    return { ok: false, positions: [], reason: 'snapshot_mismatch' }
  }
  const afterMs = params.after.capturedAtMs
  if (afterMs != null && Number.isFinite(afterMs)) {
    const latestFill = latestFillTimestampMs(params.fills)
    if (latestFill > afterMs) {
      return { ok: false, positions: [], reason: 'fill_after_snapshot' }
    }
  }
  return { ok: true, positions: params.after.positions }
}

export function utcYyyymmddStartMs(ymd: string | undefined): number | undefined {
  if (!ymd) return undefined
  const compact = ymd.replace(/-/g, '')
  if (!/^\d{8}$/.test(compact)) return undefined
  return Date.UTC(
    Number(compact.slice(0, 4)),
    Number(compact.slice(4, 6)) - 1,
    Number(compact.slice(6, 8)),
  )
}

export function tradeClosedOnOrAfter(
  trade: { closeDate?: string | null },
  startMs?: number,
): boolean {
  if (startMs == null || !Number.isFinite(startMs)) return true
  if (!trade.closeDate) return false
  const close = Date.parse(trade.closeDate)
  return Number.isFinite(close) && close >= startMs
}

export function parseOpeningSeedOrderId(
  orderId: string | null | undefined,
): { accountId: string; symbol: string } | null {
  if (!isOpeningSeedOrderId(orderId) || !orderId) return null
  const rest = orderId.slice(OPENING_SEED_ORDER_ID_PREFIX.length)
  const lastColon = rest.lastIndexOf(':')
  if (lastColon <= 0 || lastColon === rest.length - 1) return null
  return {
    accountId: rest.slice(0, lastColon),
    symbol: rest.slice(lastColon + 1).trim().toUpperCase(),
  }
}

export function indexFillsByCanonicalId(
  fills: RithmicProtocolFill[],
): Map<string, RithmicProtocolFill> {
  const map = new Map<string, RithmicProtocolFill>()
  for (const fill of fills) {
    const id = canonicalRithmicFillId(fill.fillId)
    if (id) map.set(id, fill)
  }
  return map
}

export type FillIdIndex = Map<string, RithmicProtocolFill>

/**
 * Symbols whose P_0 cannot be trusted when the bracketed snapshot fails:
 * anything in this fill window, plus any nonzero net on either snapshot.
 * When neither snapshot completed, omitted symbols might still be open —
 * callers must freeze the whole book rather than guess flat.
 */
export function uncertainOpeningSymbolKeys(params: {
  incomingFills: RithmicProtocolFill[]
  before: CapturedPositionSnapshot
  after: CapturedPositionSnapshot
}): { keys: Set<string>; determined: boolean } {
  const keys = new Set<string>()
  for (const fill of params.incomingFills) {
    const accountId = fill.accountId || 'unknown'
    const symbol = (fill.symbol || '').trim().toUpperCase()
    if (!symbol) continue
    keys.add(positionKey(accountId, symbol))
  }
  for (const position of [...params.before.positions, ...params.after.positions]) {
    if (!Number.isFinite(position.netQuantity) || position.netQuantity === 0) {
      continue
    }
    keys.add(positionKey(position.accountId, position.symbol))
  }
  return {
    keys,
    determined: params.before.complete || params.after.complete,
  }
}

export function tradeTouchesSymbolKeys(
  trade: {
    accountNumber?: string | null
    entryId?: string | null
    closeId?: string | null
  },
  symbolKeys: Set<string>,
  fills: RithmicProtocolFill[] | FillIdIndex,
): boolean {
  if (symbolKeys.size === 0) return false
  const seed = parseOpeningSeedOrderId(trade.entryId)
  if (seed && symbolKeys.has(positionKey(seed.accountId, seed.symbol))) {
    return true
  }
  const byId = Array.isArray(fills) ? indexFillsByCanonicalId(fills) : fills
  for (const rawId of [trade.entryId, trade.closeId]) {
    const id = canonicalRithmicFillId(rawId)
    if (!id) continue
    const fill = byId.get(id)
    if (!fill) continue
    if (symbolKeys.has(positionKey(fill.accountId || 'unknown', fill.symbol))) {
      return true
    }
  }
  return false
}

export type OrdinarySyncTradePlan<T> = {
  persist: T[]
  derivedForPhantoms: T[]
  skipPhantomDelete: boolean
  dropReasons: Record<string, number>
  stampLastSyncedAt: boolean
  syncStatus: 'ok' | 'degraded'
  frozenSymbolCount: number
  warnings: string[]
}

/**
 * Ordinary sync must not persist or reap trades that depend on a non-flat
 * opening when the broker snapshot is missing. Pre-historyStartDate closes
 * stay in the derived set for phantom matching but are not written.
 *
 * When the snapshot is unavailable but we can still name uncertain symbols
 * (a completed book, or incoming fills / nonzero snapshot rows), only those
 * symbols freeze. A fully undetermined book freezes everything and must not
 * stamp lastSyncedAt.
 */
export function planOrdinarySyncTrades<
  T extends {
    entryId?: string | null
    closeId?: string | null
    closeDate?: string | null
    accountNumber?: string | null
  },
>(params: {
  trades: T[]
  fills: RithmicProtocolFill[]
  snapshotOk: boolean
  skippedSymbolKeys: Set<string>
  uncertainSymbolKeys?: Set<string>
  openingStateDetermined?: boolean
  historyStartMs?: number
}): OrdinarySyncTradePlan<T> {
  const determined =
    params.snapshotOk || params.openingStateDetermined === true
  if (!params.snapshotOk && !determined) {
    return {
      persist: [],
      derivedForPhantoms: [],
      skipPhantomDelete: true,
      dropReasons: {
        snapshot_unavailable_trades_skipped: params.trades.length,
      },
      stampLastSyncedAt: false,
      syncStatus: 'degraded',
      frozenSymbolCount: params.trades.length,
      warnings: [
        'Broker position snapshot was unavailable; existing trades were left unchanged.',
      ],
    }
  }

  const skipKeys = new Set(params.skippedSymbolKeys)
  if (!params.snapshotOk) {
    for (const key of params.uncertainSymbolKeys ?? []) skipKeys.add(key)
  }
  const fillIndex = indexFillsByCanonicalId(params.fills)
  const skippedTrades = params.trades.filter((trade) =>
    tradeTouchesSymbolKeys(trade, skipKeys, fillIndex),
  )
  const unskipped = params.trades.filter(
    (trade) => !tradeTouchesSymbolKeys(trade, skipKeys, fillIndex),
  )
  const persist = unskipped.filter((trade) =>
    tradeClosedOnOrAfter(trade, params.historyStartMs),
  )
  const preHistory = unskipped.length - persist.length
  const dropReasons: Record<string, number> = {}
  if (skippedTrades.length > 0) {
    dropReasons.opening_snapshot_symbol_skipped = skippedTrades.length
  }
  if (preHistory > 0) {
    dropReasons.closed_before_history_start = preHistory
  }
  const frozen = !params.snapshotOk && skipKeys.size > 0
  const warnings = frozen
    ? [
        'Broker position snapshot was unavailable; existing trades for those symbols were left unchanged.',
      ]
    : []
  return {
    persist,
    derivedForPhantoms: unskipped,
    skipPhantomDelete: false,
    dropReasons,
    stampLastSyncedAt: !frozen,
    syncStatus: frozen ? 'degraded' : 'ok',
    frozenSymbolCount: skipKeys.size,
    warnings,
  }
}

export function openingSeedOrderId(accountId: string, symbol: string): string {
  return `${OPENING_SEED_ORDER_ID_PREFIX}${accountId}:${symbol.trim().toUpperCase()}`
}

export function isOpeningSeedOrderId(
  orderId: string | null | undefined,
): boolean {
  if (!orderId) return false
  return orderId.startsWith(OPENING_SEED_ORDER_ID_PREFIX)
}

export function isProtocolSystemTag(tag: string | null | undefined): boolean {
  return (
    tag === RITHMIC_PROTOCOL_TRADE_TAG ||
    tag === RITHMIC_PROTOCOL_OPENING_SEED_TAG
  )
}

function fillNetsBySymbol(
  fills: RithmicProtocolFill[],
): Map<string, { accountId: string; symbol: string; net: number; fillCount: number }> {
  const groups = new Map<
    string,
    { accountId: string; symbol: string; net: number; fillCount: number }
  >()
  for (const fill of fills) {
    const accountId = fill.accountId || 'unknown'
    const symbol = (fill.symbol || '').trim().toUpperCase()
    if (!symbol) continue
    const key = positionKey(accountId, symbol)
    const group = groups.get(key) ?? {
      accountId,
      symbol,
      net: 0,
      fillCount: 0,
    }
    group.net += signedFillSize(fill)
    group.fillCount += 1
    groups.set(key, group)
  }
  return groups
}

/**
 * Per exact-symbol opening position: P_0 = P_end − net(fills).
 *
 * A successful snapshot that omits a symbol means that symbol is flat
 * (`P_end = 0`). Callers must not invoke this when the snapshot is incomplete.
 */
export function computeOpeningPositionChecks(params: {
  fills: RithmicProtocolFill[]
  positions: InstrumentPosition[]
}): OpeningPositionCheck[] {
  const nets = fillNetsBySymbol(params.fills)
  const pEndByKey = new Map<string, number>()
  for (const position of params.positions) {
    const accountId = position.accountId.trim()
    const symbol = position.symbol.trim().toUpperCase()
    if (!accountId || !symbol) continue
    pEndByKey.set(positionKey(accountId, symbol), position.netQuantity)
  }

  const keys = new Set([...nets.keys(), ...pEndByKey.keys()])
  const checks: OpeningPositionCheck[] = []
  for (const key of keys) {
    const [accountId, symbol] = key.split('|')
    const netRow = nets.get(key)
    const pEnd = pEndByKey.get(key) ?? 0
    const net = netRow?.net ?? 0
    checks.push({
      accountId,
      symbol,
      instrument: normalizeInstrument(symbol),
      pEnd,
      net,
      p0: pEnd - net,
      fillCount: netRow?.fillCount ?? 0,
    })
  }
  return checks.sort((a, b) => {
    const byAccount = a.accountId.localeCompare(b.accountId)
    if (byAccount !== 0) return byAccount
    return a.symbol.localeCompare(b.symbol)
  })
}

function hasUsablePrice(fill: RithmicProtocolFill): boolean {
  const price = Number(fill.fillPrice || fill.avgFillPrice || 0)
  return Number.isFinite(price) && price !== 0
}

/**
 * Seed when P_0 is a known integer. Refuse when it is not a whole number
 * (corrupt size) rather than inventing a fractional lot. Price is not
 * required up front: closes against the seed use the closing fill's price
 * and attribute 0 PnL.
 *
 * A seed with no later close (weekend hold still open) stays as `openSkipped`
 * and never becomes a Trade row.
 *
 * `|P_0| > window gross` is treated as a fill-less termination / reset rather
 * than an opening to seed: skip that symbol instead of inventing the opposite
 * side. A still-open weekend hold with no fills in the window (`gross = 0`)
 * takes the same skip path and does not persist a trade.
 */
export function decideOpeningSeeds(
  checks: OpeningPositionCheck[],
  fills: RithmicProtocolFill[],
  windowStartMs: number,
): {
  seeds: OpeningLotSeed[]
  skipped: OpeningSeedSkip[]
  error?: 'OPENING_POSITION_UNKNOWN'
} {
  const seeds: OpeningLotSeed[] = []
  const skipped: OpeningSeedSkip[] = []
  let error: 'OPENING_POSITION_UNKNOWN' | undefined
  for (const check of checks) {
    if (check.p0 === 0) continue
    const symbolFills = fills.filter(
      (fill) =>
        (fill.accountId || 'unknown') === check.accountId &&
        (fill.symbol || '').trim().toUpperCase() === check.symbol,
    )
    const gross = symbolFills.reduce(
      (sum, fill) => sum + Math.abs(Number(fill.fillSize) || 0),
      0,
    )
    if (Math.abs(check.p0) > gross) {
      skipped.push({
        accountId: check.accountId,
        symbol: check.symbol,
        reason: 'p0_exceeds_window_gross',
      })
      if (check.fillCount > 0) error = 'OPENING_POSITION_UNKNOWN'
      continue
    }
    if (!Number.isFinite(check.p0) || !Number.isInteger(check.p0)) {
      skipped.push({
        accountId: check.accountId,
        symbol: check.symbol,
        reason: 'non_integer_p0',
      })
      error = 'OPENING_POSITION_UNKNOWN'
      continue
    }
    const closingSide = check.p0 > 0 ? 'S' : 'B'
    const wouldClose = symbolFills.filter(
      (fill) => fillSide(fill.transactionType) === closingSide,
    )
    if (wouldClose.length > 0 && !wouldClose.some(hasUsablePrice)) {
      skipped.push({
        accountId: check.accountId,
        symbol: check.symbol,
        reason: 'unpriceable_close',
      })
      error = 'OPENING_POSITION_UNKNOWN'
      continue
    }
    const firstFillMs = symbolFills.reduce((earliest, fill) => {
      const ts = fillTimestampMs(fill)
      if (ts <= 0) return earliest
      return earliest == null ? ts : Math.min(earliest, ts)
    }, null as number | null)
    const timestampMs =
      firstFillMs != null && firstFillMs > 0
        ? Math.min(windowStartMs, firstFillMs - 1)
        : windowStartMs
    seeds.push({
      accountId: check.accountId,
      symbol: check.symbol,
      netQuantity: check.p0,
      timestampMs: Number.isFinite(timestampMs) ? timestampMs : 0,
      orderId: openingSeedOrderId(check.accountId, check.symbol),
    })
  }
  return { seeds, skipped, error }
}
