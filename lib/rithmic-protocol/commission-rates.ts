/** ResponseProductRmsInfo.PresenceBits.COMMISSION_FILL_RATE */
export const COMMISSION_FILL_RATE_BIT = 64

export interface ProductRmsCommissionRow {
  accountId: string
  productCode: string
  commissionFillRate: number
}

export function commissionRateKey(accountId: string, productCode: string): string {
  return `${accountId}|${productCode.trim().toUpperCase()}`
}

/**
 * Keep a product RMS row only when the plant actually sent commission_fill_rate.
 * Presence bit 64 is authoritative; if bits are omitted, a finite rate still counts.
 */
export function mapProductRmsCommissionRow(decoded: {
  accountId?: string
  productCode?: string
  commissionFillRate?: number
  presenceBits?: number
}): ProductRmsCommissionRow | null {
  const accountId = String(decoded.accountId ?? '').trim()
  const productCode = String(decoded.productCode ?? '').trim().toUpperCase()
  if (!accountId || !productCode) return null

  const bits = decoded.presenceBits
  const hasBit =
    typeof bits === 'number' && bits > 0
      ? (bits & COMMISSION_FILL_RATE_BIT) === COMMISSION_FILL_RATE_BIT
      : decoded.commissionFillRate != null
  if (!hasBit) return null

  const rate = Number(decoded.commissionFillRate)
  if (!Number.isFinite(rate)) return null

  return { accountId, productCode, commissionFillRate: rate }
}

export function indexProductRmsCommissionRates(
  rows: ProductRmsCommissionRow[],
): Map<string, number> {
  const rates = new Map<string, number>()
  for (const row of rows) {
    rates.set(commissionRateKey(row.accountId, row.productCode), row.commissionFillRate)
  }
  return rates
}

export function lookupCommissionFillRate(
  rates: Map<string, number> | undefined,
  accountId: string,
  productCode: string,
): number {
  if (!rates || rates.size === 0) return 0
  return rates.get(commissionRateKey(accountId, productCode)) ?? 0
}

export function commissionForFillQuantity(
  rates: Map<string, number> | undefined,
  accountId: string,
  productCode: string,
  quantity: number,
): number {
  const rate = lookupCommissionFillRate(rates, accountId, productCode)
  const qty = Math.abs(Number(quantity) || 0)
  return rate * qty
}
