import {
  RITHMIC_PROTOCOL_OPENING_SEED_TAG,
  RITHMIC_PROTOCOL_TRADE_TAG,
} from '@/lib/trade-id-utils'
import { fillSide, fillTimestampMs, normalizeInstrument } from './fills-to-trades'
import type { RithmicProtocolFill } from './types'

export { RITHMIC_PROTOCOL_OPENING_SEED_TAG }

export const OPENING_SEED_ORDER_ID_PREFIX = 'opening-seed:'

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

function positionKey(accountId: string, symbol: string): string {
  return `${accountId}|${symbol.trim().toUpperCase()}`
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
 */
export function decideOpeningSeeds(
  checks: OpeningPositionCheck[],
  fills: RithmicProtocolFill[],
  windowStartMs: number,
): {
  seeds: OpeningLotSeed[]
  error?: 'OPENING_POSITION_UNKNOWN'
} {
  const seeds: OpeningLotSeed[] = []
  for (const check of checks) {
    if (check.p0 === 0) continue
    if (!Number.isFinite(check.p0) || !Number.isInteger(check.p0)) {
      return { seeds: [], error: 'OPENING_POSITION_UNKNOWN' }
    }
    const symbolFills = fills.filter(
      (fill) =>
        (fill.accountId || 'unknown') === check.accountId &&
        (fill.symbol || '').trim().toUpperCase() === check.symbol,
    )
    const closingSide = check.p0 > 0 ? 'S' : 'B'
    const wouldClose = symbolFills.filter(
      (fill) => fillSide(fill.transactionType) === closingSide,
    )
    if (wouldClose.length > 0 && !wouldClose.some(hasUsablePrice)) {
      return { seeds: [], error: 'OPENING_POSITION_UNKNOWN' }
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
  return { seeds }
}
