import { createOpenAI } from "@ai-sdk/openai"

/**
 * Replacements for deprecated OpenAI generation models.
 *
 * Sources (checked 2026-11-11, not taken from third-party mail):
 * - https://developers.openai.com/api/docs/deprecations
 *   GPT-4o (`gpt-4o-2024-08-06`, `gpt-4o-2024-11-20`) and GPT-4o mini
 *   (`gpt-4o-mini-2024-07-18`) shut down 2027-01-14. Replacement: `gpt-6-luna`.
 *   `gpt-5-mini` / `gpt-5-nano` shut down 2026-12-11. Replacements:
 *   `gpt-5.6-terra` and `gpt-5.6-luna`.
 * - https://developers.openai.com/api/docs/models/gpt-6-luna
 *   Efficient high-volume model. `reasoning.effort` includes `none`
 *   (default is `medium`). Structured outputs, streaming, and function
 *   calling are supported. Responses is the tool-calling path.
 * - https://developers.openai.com/api/docs/guides/latest-model
 *   When reasoning effort is not `none`, omit `temperature`, `top_p`, and
 *   `top_logprobs`. GPT-6 Luna supports effort `none`.
 * - https://developers.openai.com/api/docs/models/gpt-5.6-terra
 *   Mini-tier successor ("balances intelligence and cost").
 * - https://developers.openai.com/api/docs/models/gpt-5.6-luna
 *   Nano-tier successor for cost-sensitive workloads.
 *
 * `@ai-sdk/openai` 3.0.70 treats only o-series and `gpt-5*` as reasoning
 * models, so a direct `gpt-6-luna` Responses call keeps `temperature` and
 * drops `reasoningEffort`. Luna then defaults effort to `medium` and
 * rejects temperature. `createGpt6LunaCompatibleFetch` writes
 * `reasoning.effort: "none"` back onto those bodies. It does not override
 * an effort the SDK already serialized.
 */

/** Direct Responses model id. Official GPT-4o / GPT-4o mini replacement. */
export const GPT6_LUNA_MODEL_ID = "gpt-6-luna"

/** Gateway id for the documented gpt-5-mini replacement. */
export const GPT5_MINI_SUCCESSOR = "openai/gpt-5.6-terra"

/** Gateway id for the documented gpt-5-nano replacement. */
export const GPT5_NANO_SUCCESSOR = "openai/gpt-5.6-luna"

export const openaiReasoningNone = {
  openai: { reasoningEffort: "none" as const },
}

/** Keep a sampling temperature only together with reasoning effort none. */
export function samplingWithReasoningNone(temperature: number) {
  return {
    temperature,
    providerOptions: openaiReasoningNone,
  }
}

export function ensureGpt6LunaCompatibleRequestBody(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body
  const record = body as Record<string, unknown>
  if (record.model !== GPT6_LUNA_MODEL_ID) return body

  const reasoning =
    record.reasoning &&
    typeof record.reasoning === "object" &&
    !Array.isArray(record.reasoning)
      ? (record.reasoning as Record<string, unknown>)
      : null
  if (reasoning?.effort != null || record.reasoning_effort != null) return body

  return {
    ...record,
    reasoning: {
      ...(reasoning ?? {}),
      effort: "none",
    },
  }
}

export function createGpt6LunaCompatibleFetch(
  resolveFetch: () => typeof fetch = () => globalThis.fetch,
): typeof fetch {
  return async (input, init) => {
    let nextInit = init
    if (typeof init?.body === "string") {
      try {
        const parsed: unknown = JSON.parse(init.body)
        const next = ensureGpt6LunaCompatibleRequestBody(parsed)
        if (next !== parsed) {
          nextInit = { ...init, body: JSON.stringify(next) }
        }
      } catch {
        // Non-JSON bodies (multipart transcription, etc.) pass through.
      }
    }
    return resolveFetch()(input, nextInit)
  }
}

/** OpenAI provider whose Responses calls stay valid for gpt-6-luna. */
export const openaiGeneration = createOpenAI({
  fetch: createGpt6LunaCompatibleFetch(),
})

export function gpt6LunaModel() {
  return openaiGeneration(GPT6_LUNA_MODEL_ID)
}
