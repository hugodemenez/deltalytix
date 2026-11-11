import { createOpenAI } from "@ai-sdk/openai"

/**
 * Replacements for deprecated OpenAI generation models.
 *
 * Sources (checked 2026-11-11, not taken from third-party mail):
 * - https://developers.openai.com/api/docs/deprecations
 *   GPT-4o (`gpt-4o`, `gpt-4o-2024-08-06`, `gpt-4o-2024-11-20`) and GPT-4o mini
 *   (`gpt-4o-mini`, `gpt-4o-mini-2024-07-18`) shut down 2027-01-14.
 *   Replacement named on that page: `gpt-6-luna`.
 *   `gpt-5-mini` (`gpt-5-mini-2025-08-07`) and `gpt-5-nano`
 *   (`gpt-5-nano-2025-08-07`) shut down 2026-12-11. Replacements named there:
 *   `gpt-5.6-terra` and `gpt-5.6-luna`.
 * - https://developers.openai.com/api/docs/models/gpt-6-luna
 *   The only published snapshot is `gpt-6-luna`. Efficient high-volume model.
 *   `reasoning.effort` includes `none` (default `medium`). Text price
 *   $0.10 input / $0.50 output per 1M tokens. Structured outputs, streaming,
 *   and function calling. Responses is the tool-calling path.
 * - https://developers.openai.com/api/docs/guides/latest-model
 *   When reasoning effort is not `none`, omit `temperature`, `top_p`, and
 *   `top_logprobs`. GPT-6 Luna supports effort `none`.
 * - https://developers.openai.com/api/docs/models/gpt-5.6-terra
 *   Mini-tier successor. Input $2 / output $12 per 1M. Used here only for
 *   multi-step tool agents.
 * - https://developers.openai.com/api/docs/models/gpt-5.6-luna
 *   Nano-tier successor. Input $0.20 / output $1.20 per 1M. Weekly recap
 *   already uses it at effort high and is left unchanged. It is not the
 *   cheaper choice for new short calls: Luna is half the input price and
 *   less than half the output price.
 *
 * `@ai-sdk/openai` 3.0.70 treats only the o-series and `gpt-5*` as reasoning
 * models. `providerOptions.openai.forceReasoning` overrides that. Without it,
 * a direct `gpt-6-luna` call keeps `temperature` and drops `reasoningEffort`.
 * Luna then defaults effort to `medium` and rejects temperature.
 *
 * `samplingWithReasoningNone` is the temperature + effort `none` path: the
 * SDK keeps temperature, and `createGpt6LunaCompatibleFetch` writes
 * `reasoning.effort: "none"` onto that body. `lunaReasoning` is the explicit
 * effort path: `forceReasoning` makes 3.0.70 serialize the effort and strip
 * temperature, topP, and logprobs. The wrapper does not replace an effort
 * the SDK already serialized, and it does not invent `none` when the body
 * has no sampling parameter.
 *
 * Do not send `forceReasoning` or a temperature to the gateway with
 * `openai/gpt-6-luna`. `forceReasoning` is an SDK flag, not an OpenAI field.
 * The gateway client forwards temperature as-is; if its server drops the
 * effort, Luna rejects the temperature. Gateway one-shots therefore omit
 * temperature and send only `reasoningEffort`.
 */

/** Official direct Responses id. The model page lists this snapshot only. */
export const GPT6_LUNA_MODEL_ID = "gpt-6-luna"

/** Same official id on the AI Gateway. */
export const GPT6_LUNA_GATEWAY_MODEL = "openai/gpt-6-luna"

/**
 * Chat and the support agent. Documented gpt-5-mini successor, kept because
 * those calls are multi-step tool loops. List price is about 8× input and
 * 6× output versus gpt-5-mini ($0.25/$2 → $2/$12 per 1M).
 */
export const TOOL_AGENT_MODEL = "openai/gpt-5.6-terra"

export type OpenAiReasoningEffort =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max"

/**
 * Gateway provider option only. No `forceReasoning`, no temperature.
 * Whether the gateway forwards `reasoningEffort` for gpt-6-luna is unverified.
 * With no temperature, a dropped effort still defaults to medium and stays valid.
 */
export function gatewayReasoning(effort: OpenAiReasoningEffort) {
  return {
    openai: { reasoningEffort: effort },
  }
}

/**
 * Direct gpt-6-luna effort. `forceReasoning` is required: bare
 * `reasoningEffort` is ignored for this model on @ai-sdk/openai 3.0.70.
 * Do not also pass temperature. Effort `none` still strips temperature on
 * this SDK, because `supportsNonReasoningParameters` stops at gpt-5.5.
 */
export function lunaReasoning(effort: OpenAiReasoningEffort) {
  return {
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: effort,
      },
    },
  }
}

/**
 * Keep a sampling temperature together with reasoning effort none on the
 * direct gpt-6-luna client. The SDK drops the effort; the fetch wrapper
 * puts it back. Not for gateway model strings, and not for effort other
 * than none — use `lunaReasoning` for those.
 */
export function samplingWithReasoningNone(temperature: number) {
  return {
    temperature,
    providerOptions: gatewayReasoning("none"),
  }
}

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

const SAMPLING_KEYS = ["temperature", "top_p", "top_logprobs"] as const

function reasoningEffort(record: Record<string, unknown>): unknown {
  const reasoning = record.reasoning
  if (reasoning && typeof reasoning === "object" && !Array.isArray(reasoning)) {
    const effort = (reasoning as Record<string, unknown>).effort
    if (effort != null) return effort
  }
  return record.reasoning_effort
}

function withoutSampling(record: Record<string, unknown>) {
  const next = { ...record }
  for (const key of SAMPLING_KEYS) delete next[key]
  return next
}

export function ensureGpt6LunaCompatibleRequestBody(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body
  const record = body as Record<string, unknown>
  if (record.model !== GPT6_LUNA_MODEL_ID) return body

  const effort = reasoningEffort(record)
  if (effort != null && effort !== "none") {
    const hasSampling = SAMPLING_KEYS.some((key) => record[key] != null)
    return hasSampling ? withoutSampling(record) : body
  }
  if (effort === "none") return body

  const hasSampling = SAMPLING_KEYS.some((key) => record[key] != null)
  if (!hasSampling) return body

  const reasoning =
    record.reasoning &&
    typeof record.reasoning === "object" &&
    !Array.isArray(record.reasoning)
      ? (record.reasoning as Record<string, unknown>)
      : {}
  return {
    ...record,
    reasoning: { ...reasoning, effort: "none" },
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
        // Non-JSON bodies pass through.
      }
    }
    return resolveFetch()(input, nextInit)
  }
}

/** Direct Responses provider. The wrapper repairs gpt-6-luna bodies only. */
export const openaiGeneration = createOpenAI({
  fetch: createGpt6LunaCompatibleFetch(),
})

export function gpt6LunaModel() {
  return openaiGeneration(GPT6_LUNA_MODEL_ID)
}
