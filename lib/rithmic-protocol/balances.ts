import type { RithmicProtocolAccountBalance } from './types'

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
