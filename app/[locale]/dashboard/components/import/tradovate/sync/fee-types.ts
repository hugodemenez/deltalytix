/** Fee type keys matching TradovateFillFee fields - shared with client components */
export const TRADOVATE_FEE_TYPE_KEYS = [
  'commission',
  'exchangeFee',
  'clearingFee',
  'nfaFee',
  'brokerageFee',
  'orderRoutingFee',
] as const

export type TradovateFeeTypeKey = (typeof TRADOVATE_FEE_TYPE_KEYS)[number]

/** Default: commission only (matches legacy behavior) */
export const DEFAULT_INCLUDED_FEE_TYPES: Record<TradovateFeeTypeKey, boolean> = {
  commission: true,
  exchangeFee: false,
  clearingFee: false,
  nfaFee: false,
  brokerageFee: false,
  orderRoutingFee: false,
}

export type TradovateIncludedFeeTypes = Partial<Record<TradovateFeeTypeKey, boolean>>
