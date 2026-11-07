/**
 * Instrument-level PnL plant snapshot (template 450). Admin rebuild is the
 * only caller — ordinary sync still ignores these rows.
 */

export type RithmicProtocolInstrumentPosition = {
  accountId: string
  symbol: string
  exchange?: string
  netQuantity: number
}

export type InstrumentPnLPositionUpdateFields = {
  accountId?: string
  fcmId?: string
  ibId?: string
  symbol?: string
  exchange?: string
  netQuantity?: number | string
  isSnapshot?: boolean
}

function toInteger(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) return null
    return value
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Number(value.trim())
  }
  return null
}

export type InspectInstrumentPnLUpdate =
  | { status: 'ignored' }
  | { status: 'ok'; position: RithmicProtocolInstrumentPosition }
  | { status: 'malformed'; reason: 'invalid_net_quantity' | 'missing_identity' }

/**
 * Live (`isSnapshot === false`) 450 pushes are ignored. A missing
 * `isSnapshot` is treated as a snapshot row so an omitted flag cannot
 * drop a 402 response. That default is not proven by a plant capture.
 */
export function inspectInstrumentPnLUpdate(
  decoded: InstrumentPnLPositionUpdateFields,
): InspectInstrumentPnLUpdate {
  if (decoded.isSnapshot === false) return { status: 'ignored' }
  const accountId = String(decoded.accountId ?? '').trim()
  const symbol = String(decoded.symbol ?? '').trim().toUpperCase()
  if (!accountId || !symbol) {
    return { status: 'malformed', reason: 'missing_identity' }
  }
  if (decoded.netQuantity == null) {
    return { status: 'malformed', reason: 'invalid_net_quantity' }
  }
  const netQuantity = toInteger(decoded.netQuantity)
  if (netQuantity == null) {
    return { status: 'malformed', reason: 'invalid_net_quantity' }
  }
  return {
    status: 'ok',
    position: {
      accountId,
      symbol,
      exchange: decoded.exchange,
      netQuantity,
    },
  }
}

/**
 * Map a Protocol InstrumentPnLPositionUpdate into a per-exact-symbol net.
 * Live (non-snapshot) 450 pushes are ignored — `isSnapshot === false`.
 */
export function mapInstrumentPnLUpdate(
  decoded: InstrumentPnLPositionUpdateFields,
): RithmicProtocolInstrumentPosition | null {
  const inspected = inspectInstrumentPnLUpdate(decoded)
  return inspected.status === 'ok' ? inspected.position : null
}

export type CapturedInstrumentSnapshot = {
  positions: RithmicProtocolInstrumentPosition[]
  complete: boolean
  reason?: string
  capturedAtMs: number
  capturedUntilMs: number
  noDataAccountIds: string[]
  incompleteAccountIds: string[]
  rejectedAccountIds: string[]
  missingAccountIds: string[]
  evidenceAccountIds: string[]
  requestedAccountIds: string[]
  malformedAccountIds?: string[]
  lateInstrumentAccountIds?: string[]
  accountNetQuantity?: number
}

function positionNetMap(
  positions: RithmicProtocolInstrumentPosition[],
  accountId?: string,
): Map<string, number> {
  const map = new Map<string, number>()
  const wanted = accountId?.trim()
  for (const position of positions) {
    if (wanted && position.accountId !== wanted) continue
    const symbol = position.symbol.trim().toUpperCase()
    if (!symbol) continue
    const key = `${position.accountId}|${symbol}`
    map.set(key, (map.get(key) ?? 0) + position.netQuantity)
  }
  return map
}

/** Missing symbols count as flat (0) so omit vs explicit 0 is equal. */
export function instrumentPositionMapsEqual(
  left: RithmicProtocolInstrumentPosition[],
  right: RithmicProtocolInstrumentPosition[],
  accountId?: string,
): boolean {
  const a = positionNetMap(left, accountId)
  const b = positionNetMap(right, accountId)
  const keys = new Set([...a.keys(), ...b.keys()])
  for (const key of keys) {
    if ((a.get(key) ?? 0) !== (b.get(key) ?? 0)) return false
  }
  return true
}

export function snapshotTouchesAccount(
  snapshot: CapturedInstrumentSnapshot,
  accountId: string,
  key:
    | 'noDataAccountIds'
    | 'incompleteAccountIds'
    | 'rejectedAccountIds'
    | 'missingAccountIds'
    | 'evidenceAccountIds'
    | 'requestedAccountIds',
): boolean {
  return snapshot[key].some((id) => id === accountId)
}
