import { fillSide, fillTimestampMs } from './fills-to-trades'
import type { RithmicProtocolFill } from './types'
import type { RithmicProtocolInstrumentPosition } from './instrument-position'

export type OpeningPositionCheck = {
  accountId: string
  symbol: string
  /** Live broker net for this exact symbol. 0 when the snapshot omits it. */
  pEnd: number
  /** Signed fill net in the window (`BUY` +, `SELL` −). */
  net: number
  /** Opening at the weekend anchor: P_end − net(fills). */
  p0: number
  fillCount: number
  buyLots: number
  sellLots: number
}

export function exactSymbolKey(accountId: string, symbol: string): string {
  return `${accountId.trim()}|${symbol.trim().toUpperCase()}`
}

export function signedFillSize(fill: RithmicProtocolFill): number {
  const quantity = Math.abs(Number(fill.fillSize) || 0)
  return fillSide(fill.transactionType) === 'B' ? quantity : -quantity
}

function fillLots(fill: RithmicProtocolFill): number {
  return Math.abs(Number(fill.fillSize) || 0)
}

/**
 * P_0 = P_end − net(fills in the window), keyed by account and exact
 * contract symbol. Missing snapshot rows count as P_end = 0.
 *
 * This helper never invents seed lots. A non-zero P_0 means the window
 * does not start flat and the caller must refuse.
 */
export function computeOpeningPositionChecks(params: {
  fills: RithmicProtocolFill[]
  positions: RithmicProtocolInstrumentPosition[]
  accountId: string
}): OpeningPositionCheck[] {
  const accountId = params.accountId.trim()
  const pEndBySymbol = new Map<string, number>()
  for (const position of params.positions) {
    if (position.accountId !== accountId) continue
    const symbol = position.symbol.trim().toUpperCase()
    if (!symbol) continue
    pEndBySymbol.set(symbol, (pEndBySymbol.get(symbol) ?? 0) + position.netQuantity)
  }

  const fillBySymbol = new Map<
    string,
    { net: number; fillCount: number; buyLots: number; sellLots: number }
  >()
  for (const fill of params.fills) {
    if (fill.accountId !== accountId) continue
    const symbol = (fill.symbol || '').trim().toUpperCase()
    if (!symbol) continue
    const group = fillBySymbol.get(symbol) ?? {
      net: 0,
      fillCount: 0,
      buyLots: 0,
      sellLots: 0,
    }
    const lots = fillLots(fill)
    const signed = signedFillSize(fill)
    group.net += signed
    group.fillCount += 1
    if (signed >= 0) group.buyLots += lots
    else group.sellLots += lots
    fillBySymbol.set(symbol, group)
  }

  const symbols = new Set([...pEndBySymbol.keys(), ...fillBySymbol.keys()])
  const checks: OpeningPositionCheck[] = []
  for (const symbol of [...symbols].sort()) {
    const fills = fillBySymbol.get(symbol) ?? {
      net: 0,
      fillCount: 0,
      buyLots: 0,
      sellLots: 0,
    }
    const pEnd = pEndBySymbol.get(symbol) ?? 0
    checks.push({
      accountId,
      symbol,
      pEnd,
      net: fills.net,
      p0: pEnd - fills.net,
      fillCount: fills.fillCount,
      buyLots: fills.buyLots,
      sellLots: fills.sellLots,
    })
  }
  return checks
}

export function nonFlatOpeningChecks(
  checks: OpeningPositionCheck[],
): OpeningPositionCheck[] {
  return checks.filter((check) => check.p0 !== 0)
}

export function formatOpeningNotFlatReport(
  checks: OpeningPositionCheck[],
): string {
  const rows = nonFlatOpeningChecks(checks)
  if (rows.length === 0) return ''
  const lines = rows.map(
    (row) =>
      `${row.symbol}: P_0=${signed(row.p0)} (P_end=${signed(row.pEnd)}, window net=${signed(row.net)}, ${row.buyLots} buy lots / ${row.sellLots} sell lots)`,
  )
  return (
    `Start is not flat at this weekend anchor. Pick an earlier Friday 17:00 CT close. ` +
    lines.join('; ')
  )
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

export function fillHasSsboe(fill: RithmicProtocolFill): boolean {
  return typeof fill.ssboe === 'number' && fill.ssboe > 0
}

export function fillHasUsablePrice(fill: RithmicProtocolFill): boolean {
  const price = Number(fill.fillPrice || fill.avgFillPrice || 0)
  return Number.isFinite(price) && price !== 0
}

export function windowFillsFrom(
  fills: RithmicProtocolFill[],
  windowStartMs: number,
): RithmicProtocolFill[] {
  return fills.filter((fill) => fillTimestampMs(fill) >= windowStartMs)
}

export function groupFillsByExactSymbol(
  fills: RithmicProtocolFill[],
): Map<string, RithmicProtocolFill[]> {
  const groups = new Map<string, RithmicProtocolFill[]>()
  for (const fill of fills) {
    const symbol = (fill.symbol || '').trim().toUpperCase()
    if (!symbol) continue
    const list = groups.get(symbol) ?? []
    list.push(fill)
    groups.set(symbol, list)
  }
  return groups
}

export function parseTradeClockMs(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

/**
 * Pre-anchor rows closed strictly before the weekend close. Undated rows
 * are treated as pre-anchor so a rebuild never deletes history it cannot
 * date.
 */
export function isPreAnchorTrade(
  trade: { entryDate?: string | null; closeDate?: string | null },
  anchorMs: number,
): boolean {
  const closeMs = parseTradeClockMs(trade.closeDate)
  if (closeMs != null) return closeMs < anchorMs
  const entryMs = parseTradeClockMs(trade.entryDate)
  if (entryMs != null) return entryMs < anchorMs
  return true
}
