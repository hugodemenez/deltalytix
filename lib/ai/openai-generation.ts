/**
 * Shared OpenAI generation facts. Per-task model, effort, temperature, and
 * token caps live in `lib/ai/tasks.ts` and are applied by `resolveAiTask`.
 *
 * Sources (checked 2026-11-11):
 * - https://developers.openai.com/api/docs/deprecations
 *   GPT-4o and GPT-4o mini shut down 2027-01-14. Replacement: `gpt-6-luna`.
 *   `gpt-5-mini` and `gpt-5-nano` shut down 2026-12-11. Replacements named
 *   there: `gpt-5.6-terra` and `gpt-5.6-luna`.
 * - https://developers.openai.com/api/docs/models/gpt-6-luna
 *   Only published id: `gpt-6-luna`. Text price, rechecked 2026-11-11:
 *   $0.10 input / $0.01 cached input / $0.125 cache writes / $0.50 output
 *   per 1M tokens. Prompts over 272K input tokens are 2× input and cache
 *   and 1.5× output for the whole request. `reasoning.effort` includes
 *   `none` (default `medium`). Structured outputs, streaming, and tools.
 * - https://developers.openai.com/api/docs/guides/latest-model
 *   When effort is not `none`, omit temperature, top_p, and top_logprobs.
 *   GPT-6 Luna supports effort `none`.
 * - https://developers.openai.com/api/docs/models/gpt-5.6-luna
 *   Rechecked 2026-11-11: $0.20 input / $0.02 cached / $1.20 output per 1M.
 *   Dearer than gpt-6-luna on every text rate.
 * - https://developers.openai.com/api/docs/models/gpt-5.6-terra
 *   Rechecked 2026-11-11: $2 input / $0.20 cached / $12 output per 1M.
 *   Input is 20× gpt-6-luna ($2 vs $0.10). Output is 24× ($12 vs $0.50).
 * - https://developers.openai.com/api/docs/models/gpt-5.4-nano
 *   Deprecated (shutdown 2027-04-01). $0.20 input / $0.02 cached / $1.25
 *   output per 1M, dearer than Luna.
 *
 * `@ai-sdk/openai` 4 treats gpt-6-luna as a reasoning model whose sampling
 * mode is `reasoning-effort-none`: temperature stays on the request when
 * effort is `none`, and is stripped otherwise. The top-level AI SDK 7
 * `reasoning` option is what the provider serializes.
 *
 * `whisper-1` is a transcription model and is not selected here.
 */

/** Official direct Responses id. The model page lists this snapshot only. */
export const CHEAPEST_OPENAI_MODEL_ID = "gpt-6-luna"

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
