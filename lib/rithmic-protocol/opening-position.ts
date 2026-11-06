import {
  OPENING_SEED_ORDER_ID_PREFIX,
  RITHMIC_PROTOCOL_OPENING_SEED_TAG,
  RITHMIC_PROTOCOL_TRADE_TAG,
  isOpeningSeedCloseTrade,
} from '@/lib/trade-id-utils'
import { rithmicFillIdLookupValues } from './dedupe-fills'
import {
  fillSide,
  fillTimestampMs,
  normalizeFillAccountId,
  normalizeInstrument,
  type FifoOpenNet,
} from './fills-to-trades'
import type { RithmicProtocolFill } from './types'

/** Plant clocks and multi-account sweeps can lag a couple of seconds. */
export const SNAPSHOT_CLOCK_MARGIN_MS = 2_500

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
  unpricedCount: number
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
  return `${encodeURIComponent(normalizeFillAccountId(accountId))}|${encodeURIComponent(symbol.trim().toUpperCase())}`
}

export function parseOpeningPositionKey(key: string): {
  accountId: string
  symbol: string
} {
  const separator = key.indexOf('|')
  if (separator < 0) {
    return { accountId: decodeURIComponent(key), symbol: '' }
  }
  return {
    accountId: decodeURIComponent(key.slice(0, separator)),
    symbol: decodeURIComponent(key.slice(separator + 1)),
  }
}

function positionKey(accountId: string, symbol: string): string {
  return openingPositionKey(accountId, symbol)
}

function hasUsablePrice(fill: RithmicProtocolFill): boolean {
  const price = Number(fill.fillPrice || fill.avgFillPrice || 0)
  return Number.isFinite(price) && price !== 0
}

export type CapturedPositionSnapshot = {
  positions: InstrumentPosition[]
  complete: boolean
  reason?: string
  /** Start of the PnL sweep. */
  capturedAtMs?: number
  /** End of the PnL sweep (multi-account). Falls back to capturedAtMs. */
  capturedUntilMs?: number
  noDataAccountIds?: string[]
}

export type OpeningSeedSkipReason =
  | 'p0_exceeds_window_gross'
  | 'non_integer_p0'
  | 'unpriceable_close'
  | 'unpriced_fills'
  | 'fill_less_expiry'

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
    const accountId = normalizeFillAccountId(position.accountId)
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

function snapshotClockMs(snapshot: CapturedPositionSnapshot): number | undefined {
  const ms = snapshot.capturedAtMs
  return ms != null && Number.isFinite(ms) ? ms : undefined
}

function snapshotUntilMs(snapshot: CapturedPositionSnapshot): number | undefined {
  const until = snapshot.capturedUntilMs
  if (until != null && Number.isFinite(until)) return until
  return snapshotClockMs(snapshot)
}

function noDataAccountsWithFills(
  snapshots: CapturedPositionSnapshot[],
  fills: RithmicProtocolFill[],
): boolean {
  const noData = new Set<string>()
  for (const snapshot of snapshots) {
    for (const accountId of snapshot.noDataAccountIds ?? []) {
      if (accountId) noData.add(normalizeFillAccountId(accountId))
    }
  }
  if (noData.size === 0) return false
  return fills.some((fill) => noData.has(normalizeFillAccountId(fill.accountId)))
}

/**
 * Snapshot before fills, snapshot after. Either incomplete, a position-map
 * mismatch, missing clocks, plant lag (fills between equal books), PnL
 * no-data on an account that still has fills, or a fill timestamp after
 * the after-snapshot clock means P_0 cannot be trusted — treat as
 * POSITION_SNAPSHOT_UNAVAILABLE.
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
  const beforeMs = snapshotClockMs(params.before)
  const afterMs = snapshotUntilMs(params.after)
  if (beforeMs == null || afterMs == null) {
    return { ok: false, positions: [], reason: 'snapshot_clock_missing' }
  }
  if (beforeMs > afterMs) {
    return { ok: false, positions: [], reason: 'snapshot_clock_order' }
  }
  if (noDataAccountsWithFills([params.before, params.after], params.fills)) {
    return { ok: false, positions: [], reason: 'pnl_no_data' }
  }
  if (!instrumentPositionMapsEqual(params.before.positions, params.after.positions)) {
    return { ok: false, positions: [], reason: 'snapshot_mismatch' }
  }
  const margin = SNAPSHOT_CLOCK_MARGIN_MS
  const latestFill = latestFillTimestampMs(params.fills)
  if (latestFill > afterMs + margin) {
    return { ok: false, positions: [], reason: 'fill_after_snapshot' }
  }
  const between = fillNetsBySymbol(params.fills, {
    fromMsExclusive: beforeMs - margin,
    toMsInclusive: afterMs,
  })
  for (const group of between.values()) {
    // Equal-net round trips still move the book while the PnL plant lags.
    // Any fill between the clocks means P_0 cannot be trusted.
    if (group.fillCount > 0) {
      return { ok: false, positions: [], reason: 'fills_during_equal_snapshots' }
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

/** Keep frozen symbols and pre-history / rolling-cutoff rows instead of reaping them. */
export function retainOrdinarySyncRow(
  row: {
    accountNumber?: string | null
    entryId?: string | null
    closeId?: string | null
    closeDate?: string | null
  },
  params: {
    freezeKeys: Set<string>
    fills: RithmicProtocolFill[] | Map<string, RithmicProtocolFill>
    historyStartMs?: number
  },
): boolean {
  if (tradeTouchesSymbolKeys(row, params.freezeKeys, params.fills)) return true
  return !tradeClosedOnOrAfter(row, params.historyStartMs)
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
    for (const id of rithmicFillIdLookupValues(fill.fillId)) {
      map.set(id, fill)
    }
    for (const absorbed of fill.absorbedFillIds ?? []) {
      for (const id of rithmicFillIdLookupValues(absorbed)) {
        map.set(id, fill)
      }
    }
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
    const accountId = normalizeFillAccountId(fill.accountId)
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
    for (const id of rithmicFillIdLookupValues(rawId)) {
      const fill = byId.get(id)
      if (!fill) continue
      if (symbolKeys.has(positionKey(fill.accountId, fill.symbol))) {
        return true
      }
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
  fillHistoryComplete?: boolean
  /** Fill ids already present on stored protocol trades. */
  persistedFillIds?: Set<string>
}): OrdinarySyncTradePlan<T> {
  if (params.fillHistoryComplete === false) {
    return {
      persist: [],
      derivedForPhantoms: [],
      skipPhantomDelete: true,
      dropReasons: {
        incomplete_fill_history_trades_skipped: params.trades.length,
      },
      stampLastSyncedAt: false,
      syncStatus: 'degraded',
      frozenSymbolCount: params.trades.length,
      warnings: [
        'Fill history fetch was incomplete; existing trades were left unchanged.',
      ],
    }
  }
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
  const persist = unskipped.filter((trade) => {
    if (tradeClosedOnOrAfter(trade, params.historyStartMs)) return true
    // Legacy fills that were frozen past the rolling cutoff still persist
    // once they have never appeared on a stored row.
    return tradeHasUnpersistedFillIds(trade, params.persistedFillIds)
  })
  const preHistoryDropped = unskipped.length - persist.length
  const dropReasons: Record<string, number> = {}
  if (skippedTrades.length > 0) {
    dropReasons.opening_snapshot_symbol_skipped = skippedTrades.length
  }
  if (preHistoryDropped > 0) {
    dropReasons.closed_before_history_start = preHistoryDropped
  }
  const frozen = skipKeys.size > 0
  const warnings = frozen
    ? [
        params.snapshotOk
          ? 'Opening-position symbols were skipped; existing trades for those symbols were left unchanged.'
          : 'Broker position snapshot was unavailable; existing trades for those symbols were left unchanged.',
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

function tradeHasUnpersistedFillIds(
  trade: { entryId?: string | null; closeId?: string | null },
  persistedFillIds?: Set<string>,
): boolean {
  if (!persistedFillIds) return false
  for (const rawId of [trade.entryId, trade.closeId]) {
    for (const id of rithmicFillIdLookupValues(rawId)) {
      if (id && !persistedFillIds.has(id)) return true
    }
  }
  return false
}

export function fifoEndPositionMatchesPEnd(params: {
  openNets: FifoOpenNet[]
  positions: InstrumentPosition[]
  skippedSymbolKeys?: Set<string>
}): { ok: boolean; mismatchedKeys: string[] } {
  const expected = positionNetMap(params.positions)
  const actual = new Map<string, number>()
  for (const row of params.openNets) {
    actual.set(positionKey(row.accountId, row.symbol), row.net)
  }
  const keys = new Set([...expected.keys(), ...actual.keys()])
  const mismatchedKeys: string[] = []
  for (const key of keys) {
    if (params.skippedSymbolKeys?.has(key)) continue
    if ((expected.get(key) ?? 0) !== (actual.get(key) ?? 0)) {
      mismatchedKeys.push(key)
    }
  }
  return { ok: mismatchedKeys.length === 0, mismatchedKeys }
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
  range?: { fromMsExclusive?: number; toMsInclusive?: number; sinceMs?: number },
): Map<
  string,
  {
    accountId: string
    symbol: string
    net: number
    fillCount: number
    unpricedCount: number
  }
> {
  const groups = new Map<
    string,
    {
      accountId: string
      symbol: string
      net: number
      fillCount: number
      unpricedCount: number
    }
  >()
  for (const fill of fills) {
    const ts = fillTimestampMs(fill)
    if (range?.sinceMs != null && Number.isFinite(range.sinceMs) && ts < range.sinceMs) {
      continue
    }
    if (
      range?.fromMsExclusive != null &&
      Number.isFinite(range.fromMsExclusive) &&
      !(ts > range.fromMsExclusive)
    ) {
      continue
    }
    if (
      range?.toMsInclusive != null &&
      Number.isFinite(range.toMsInclusive) &&
      ts > range.toMsInclusive
    ) {
      continue
    }
    const accountId = normalizeFillAccountId(fill.accountId)
    const symbol = (fill.symbol || '').trim().toUpperCase()
    if (!symbol) continue
    const key = positionKey(accountId, symbol)
    const group = groups.get(key) ?? {
      accountId,
      symbol,
      net: 0,
      fillCount: 0,
      unpricedCount: 0,
    }
    group.fillCount += 1
    if (!hasUsablePrice(fill)) {
      group.unpricedCount += 1
      groups.set(key, group)
      continue
    }
    group.net += signedFillSize(fill)
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
  sinceMs?: number
}): OpeningPositionCheck[] {
  const nets = fillNetsBySymbol(params.fills, { sinceMs: params.sinceMs })
  const pEndByKey = new Map<string, number>()
  for (const position of params.positions) {
    const accountId = normalizeFillAccountId(position.accountId)
    const symbol = position.symbol.trim().toUpperCase()
    if (!accountId || !symbol) continue
    pEndByKey.set(positionKey(accountId, symbol), position.netQuantity)
  }

  const keys = new Set([...nets.keys(), ...pEndByKey.keys()])
  const checks: OpeningPositionCheck[] = []
  for (const key of keys) {
    const parsed = parseOpeningPositionKey(key)
    const accountId = parsed.accountId
    const symbol = parsed.symbol
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
      unpricedCount: netRow?.unpricedCount ?? 0,
    })
  }
  return checks.sort((a, b) => {
    const byAccount = a.accountId.localeCompare(b.accountId)
    if (byAccount !== 0) return byAccount
    return a.symbol.localeCompare(b.symbol)
  })
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
    const symbolFills = fills.filter((fill) => {
      if (normalizeFillAccountId(fill.accountId) !== check.accountId) return false
      if ((fill.symbol || '').trim().toUpperCase() !== check.symbol) return false
      if (windowStartMs > 0 && fillTimestampMs(fill) < windowStartMs) return false
      return true
    })
    if (check.unpricedCount > 0) {
      skipped.push({
        accountId: check.accountId,
        symbol: check.symbol,
        reason: 'unpriced_fills',
      })
      error = 'OPENING_POSITION_UNKNOWN'
      continue
    }
    const gross = symbolFills.reduce(
      (sum, fill) => sum + Math.abs(Number(fill.fillSize) || 0),
      0,
    )
    if (Math.abs(check.p0) > gross) {
      skipped.push({
        accountId: check.accountId,
        symbol: check.symbol,
        reason: check.fillCount === 0 ? 'fill_less_expiry' : 'p0_exceeds_window_gross',
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
        ? firstFillMs - 1
        : Number.isFinite(windowStartMs)
          ? windowStartMs
          : 0
    seeds.push({
      accountId: check.accountId,
      symbol: check.symbol,
      netQuantity: check.p0,
      timestampMs,
      orderId: openingSeedOrderId(check.accountId, check.symbol),
    })
  }
  return { seeds, skipped, error }
}
