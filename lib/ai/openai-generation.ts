import { openai } from "@ai-sdk/openai"

/**
 * OpenAI generation models used by Deltalytix.
 *
 * Sources (checked 2026-11-11):
 * - https://developers.openai.com/api/docs/deprecations
 *   GPT-4o and GPT-4o mini shut down 2027-01-14. Replacement: `gpt-6-luna`.
 *   `gpt-5-mini` and `gpt-5-nano` shut down 2026-12-11. Replacements named
 *   there: `gpt-5.6-terra` and `gpt-5.6-luna`.
 * - https://developers.openai.com/api/docs/models/gpt-6-luna
 *   Only published id: `gpt-6-luna`. Text price $0.10 input / $0.01 cached
 *   input / $0.50 output per 1M tokens. `reasoning.effort` includes `none`
 *   (default `medium`). Structured outputs, streaming, and function calling.
 * - https://developers.openai.com/api/docs/guides/latest-model
 *   When effort is not `none`, omit temperature, top_p, and top_logprobs.
 *   GPT-6 Luna supports effort `none`.
 * - https://developers.openai.com/api/docs/models/gpt-5.6-luna
 *   $0.20 / $1.20 per 1M. Dearer than gpt-6-luna.
 * - https://developers.openai.com/api/docs/models/gpt-5.6-terra
 *   $2 / $12 per 1M. About 20× the input price of gpt-6-luna.
 * - https://developers.openai.com/api/docs/models/gpt-5.4-nano
 *   Deprecated (shutdown 2027-04-01) and $0.20 / $1.25, dearer than Luna.
 *
 * `@ai-sdk/openai` 4 treats gpt-6-luna as a reasoning model whose sampling
 * mode is `reasoning-effort-none`: temperature stays on the request when
 * effort is `none`, and is stripped otherwise. The top-level AI SDK 7
 * `reasoning` option is what the provider serializes. No fetch rewrite and
 * no `forceReasoning` flag.
 *
 * Every OpenAI generation call uses this model at effort `none` (the lowest
 * published effort, and the only one that can be combined with temperature).
 * A live eval (`bun run test:e2e:models`) is how a task moves up a tier.
 * `perplexity/sonar` stays a gateway string for the editor's web-search
 * action. `whisper-1` is a transcription model and is not selected here.
 */

/** Official direct Responses id. The model page lists this snapshot only. */
export const CHEAPEST_OPENAI_MODEL_ID = "gpt-6-luna"

/** Lowest published effort. Valid together with temperature on gpt-6-luna. */
export const CHEAPEST_REASONING = "none" as const

/**
 * Official gpt-6-luna text prices, USD per 1M tokens.
 * https://developers.openai.com/api/docs/models/gpt-6-luna
 */
export const GPT6_LUNA_PRICE_PER_MILLION = {
  input: 0.1,
  cachedInput: 0.01,
  output: 0.5,
} as const

export type OpenAiReasoningEffort =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max"

const RETIRED_OPENAI_GENERATION_MODELS = new Set([
  "gpt-4o",
  "gpt-4o-2024-08-06",
  "gpt-4o-2024-11-20",
  "gpt-4o-mini",
  "gpt-4o-mini-2024-07-18",
  "gpt-4.1",
  "gpt-4.1-2025-04-14",
  "gpt-4.1-mini",
  "gpt-4.1-mini-2025-04-14",
  "gpt-5-mini",
  "gpt-5-mini-2025-08-07",
  "gpt-5-nano",
  "gpt-5-nano-2025-08-07",
])

/** Official shutdown ids only. Returns the bare id, without an openai/ prefix. */
export function retiredOpenAiGenerationModel(
  modelId: string | undefined | null,
): string | null {
  if (!modelId) return null
  const id = modelId.trim().replace(/^openai\//, "")
  return RETIRED_OPENAI_GENERATION_MODELS.has(id) ? id : null
}

const warnedRetiredOverrides = new Set<string>()

export function warnIfRetiredModelOverride(
  envName: string,
  modelId: string | undefined,
) {
  const retired = retiredOpenAiGenerationModel(modelId)
  if (!retired || warnedRetiredOverrides.has(envName)) return
  warnedRetiredOverrides.add(envName)
  console.warn(
    `${envName} names retired OpenAI generation model ${retired}. ` +
      "That id is on the published shutdown list.",
  )
}

/** Direct OpenAI model. An `openai/` prefix is stripped so env overrides can use either form. */
export function openAiModel(modelId?: string) {
  const raw = modelId?.trim() || CHEAPEST_OPENAI_MODEL_ID
  return openai(raw.replace(/^openai\//, ""))
}

/** Cheapest model and lowest effort. Add `temperature` only beside effort `none`. */
export function cheapestOpenAi(modelId?: string) {
  return {
    model: openAiModel(modelId),
    reasoning: CHEAPEST_REASONING,
  }
}

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
  return (uncached * inputPrice + cached * cachedInput + output * outputPrice) / 1_000_000
}
