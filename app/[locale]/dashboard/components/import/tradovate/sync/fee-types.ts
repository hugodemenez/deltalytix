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

/** Every Tradovate fee line that can be rolled into trade commission */
export const ALL_INCLUDED_FEE_TYPES: Record<TradovateFeeTypeKey, boolean> = {
  commission: true,
  exchangeFee: true,
  clearingFee: true,
  nfaFee: true,
  brokerageFee: true,
  orderRoutingFee: true,
}

export type TradovateIncludedFeeTypes = Partial<Record<TradovateFeeTypeKey, boolean>>

export type TradovateFeeExampleChoice = 'commission-only' | 'all-fees'

/**
 * Illustrative 3-contract MNQ round-turn, labeled as an example (not a live quote).
 * Totals match a real report: commission-only $2.34 vs all-in $5.70.
 */
export const TRADOVATE_FEE_EXAMPLE_FILL: Record<TradovateFeeTypeKey, number> = {
  commission: 2.34,
  exchangeFee: 1.5,
  clearingFee: 1.2,
  nfaFee: 0.06,
  brokerageFee: 0.42,
  orderRoutingFee: 0.18,
}

export const TRADOVATE_FEE_EXAMPLE = {
  instrument: 'MNQ',
  quantity: 3,
  fill: TRADOVATE_FEE_EXAMPLE_FILL,
} as const

export type TradovateFillFeeAmounts = Partial<
  Record<TradovateFeeTypeKey, number | null>
>

/** Sum fill-fee lines that the user asked to include in trade commission. */
export function getTotalFeeFromFillFee(
  fee: TradovateFillFeeAmounts,
  includedFeeTypes: TradovateIncludedFeeTypes | boolean
): number {
  if (includedFeeTypes === true) {
    return TRADOVATE_FEE_TYPE_KEYS.reduce(
      (total, key) => total + Number(fee[key] ?? 0),
      0
    )
  }
  const types =
    typeof includedFeeTypes === 'object' && includedFeeTypes
      ? includedFeeTypes
      : { commission: true }
  let total = 0
  for (const key of TRADOVATE_FEE_TYPE_KEYS) {
    if (types[key]) total += Number(fee[key] ?? 0)
  }
  return total
}

export function includedFeeTypesForExampleChoice(
  choice: TradovateFeeExampleChoice
): Record<TradovateFeeTypeKey, boolean> {
  return choice === 'all-fees'
    ? { ...ALL_INCLUDED_FEE_TYPES }
    : { ...DEFAULT_INCLUDED_FEE_TYPES }
}

/**
 * Never persisted (null/empty) — not “commission-only after the user chose it”.
 * Dismissing the first-sync picker persists DEFAULT so we do not ask again.
 */
export function isTradovateFeePreferenceUnset(value: unknown): boolean {
  if (value == null) return true
  if (typeof value !== 'object' || Array.isArray(value)) return true
  return Object.keys(value as object).length === 0
}

export function shouldShowTradovateFeeSettings(service: string): boolean {
  return service === 'tradovate'
}

export function shouldPromptTradovateFeeExample(
  service: string,
  includedFeeTypes: unknown
): boolean {
  return (
    shouldShowTradovateFeeSettings(service) &&
    isTradovateFeePreferenceUnset(includedFeeTypes)
  )
}

/** Connexions row: settings sits next to Synchroniser and opens fee config. */
export function tradovateConnectionRowControls(service: string): {
  showFeeSettings: boolean
  feeSettingsOpens: 'fee-config' | null
} {
  if (!shouldShowTradovateFeeSettings(service)) {
    return { showFeeSettings: false, feeSettingsOpens: null }
  }
  return { showFeeSettings: true, feeSettingsOpens: 'fee-config' }
}
