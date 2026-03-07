export const supportedCurrencies = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
] as const

export type SupportedCurrency = (typeof supportedCurrencies)[number]

const currencySymbols: Record<SupportedCurrency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
  CHF: "CHF",
}

export function getCurrencySymbol(currency: SupportedCurrency): string {
  return currencySymbols[currency] ?? "$"
}

export function formatCurrencyAmount(
  value: number,
  currency: SupportedCurrency,
  options?: {
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  },
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: options?.minimumFractionDigits,
    maximumFractionDigits: options?.maximumFractionDigits,
  }).format(value)
}

export function formatCurrencyWithSymbol(
  value: number,
  currency: SupportedCurrency,
  decimals = 2,
): string {
  return `${getCurrencySymbol(currency)}${value.toFixed(decimals)}`
}
