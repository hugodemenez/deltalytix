/**
 * Official gpt-6-luna text prices, USD per 1M tokens.
 * https://developers.openai.com/api/docs/models/gpt-6-luna
 *
 * Used by the opt-in model eval to print cost. Routes do not import this.
 */
export const GPT6_LUNA_PRICE_PER_MILLION = {
  input: 0.1,
  cachedInput: 0.01,
  output: 0.5,
} as const

type TokenUsage = {
  inputTokens?: number
  outputTokens?: number
  inputTokenDetails?: {
    cacheReadTokens?: number
    noCacheTokens?: number
  }
}

/** USD for one gpt-6-luna call. Cached input is billed at the cached rate. */
export function gpt6LunaCostUsd(usage: TokenUsage | undefined): number {
  if (!usage) return 0
  const input = usage.inputTokens ?? 0
  const cached = Math.min(usage.inputTokenDetails?.cacheReadTokens ?? 0, input)
  const uncached = Math.max(0, input - cached)
  const output = usage.outputTokens ?? 0
  const { input: inputPrice, cachedInput, output: outputPrice } =
    GPT6_LUNA_PRICE_PER_MILLION
  return (
    (uncached * inputPrice + cached * cachedInput + output * outputPrice) /
    1_000_000
  )
}
