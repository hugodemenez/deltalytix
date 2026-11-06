import type {
  RithmicProtocolAccountBalance,
  RithmicProtocolInstrumentPosition,
} from './types'

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

/** Raw AccountPnLPositionUpdate fields (protobufjs camelCase). */
export type AccountPnLPositionUpdateFields = {
  accountId?: string
  fcmId?: string
  ibId?: string
  accountBalance?: string | number
  cashOnHand?: string | number
  marginBalance?: string | number
  availableBuyingPower?: string | number
  openPositionPnl?: string | number
  closedPositionPnl?: string | number
  dayPnl?: string | number
}

/**
 * Map a Protocol PnL plant account update into the shared balance shape
 * used by Solde Rithmic on the accounts table.
 */
export function mapAccountPnLUpdateToBalance(
  decoded: AccountPnLPositionUpdateFields,
): RithmicProtocolAccountBalance | null {
  const accountId = String(decoded.accountId ?? '').trim()
  if (!accountId) return null
  return {
    account_id: accountId,
    fcm_id: decoded.fcmId,
    ib_id: decoded.ibId,
    account_balance: toOptionalNumber(decoded.accountBalance),
    cash_on_hand: toOptionalNumber(decoded.cashOnHand),
    margin_balance: toOptionalNumber(decoded.marginBalance),
    available_buying_power: toOptionalNumber(decoded.availableBuyingPower),
    open_pnl: toOptionalNumber(decoded.openPositionPnl),
    closed_pnl: toOptionalNumber(decoded.closedPositionPnl),
    day_pnl: toOptionalNumber(decoded.dayPnl),
  }
}

/** Raw InstrumentPnLPositionUpdate fields (protobufjs camelCase). */
export type InstrumentPnLPositionUpdateFields = {
  accountId?: string
  fcmId?: string
  ibId?: string
  symbol?: string
  exchange?: string
  netQuantity?: number | string
  isSnapshot?: boolean
}

/**
 * Map a Protocol PnL plant instrument update into a per-symbol net quantity.
 * Snapshot rows with net 0 are kept so a flat book is distinguishable from
 * "this symbol never arrived".
 */
export function mapInstrumentPnLUpdate(
  decoded: InstrumentPnLPositionUpdateFields,
): RithmicProtocolInstrumentPosition | null {
  const accountId = String(decoded.accountId ?? '').trim()
  const symbol = String(decoded.symbol ?? '').trim().toUpperCase()
  if (!accountId || !symbol) return null
  const netQuantity = Number(decoded.netQuantity ?? 0)
  if (!Number.isFinite(netQuantity)) return null
  return {
    accountId,
    symbol,
    exchange: decoded.exchange ? String(decoded.exchange) : undefined,
    netQuantity,
  }
}
