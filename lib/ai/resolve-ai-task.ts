import "server-only"

import { openai } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"
import {
  AI_UNAVAILABLE_ERROR,
  getOpenAiAvailabilityError,
  isPlaceholderOpenAiApiKey,
} from "@/lib/ai/openai-availability"
import { warnIfRetiredModelOverride } from "@/lib/ai/openai-generation"
import {
  aiTask,
  type AiReasoningEffort,
  type AiTask,
  type AiTaskId,
} from "@/lib/ai/tasks"

export type AiTransport = "openai" | "gateway"

export type ResolvedAiTask = {
  model: LanguageModel
  reasoning?: AiReasoningEffort
  temperature?: number
  maxOutputTokens?: number
  providerOptions?: {
    openai: { reasoningSummary: AiTask["reasoningSummary"] }
  }
}

/**
 * Transport rule:
 * - With no env override, the registry `provider` field wins. A slash in the
 *   default model id does not change that.
 * - An override of `openai/<id>` or a bare id uses the direct OpenAI provider.
 * - An override of `<other>/<model>` uses the AI Gateway.
 *
 * Reasoning effort is always copied onto the call, including gateway models.
 * A non-OpenAI gateway provider may ignore it; that case logs once.
 * OpenAI reasoning summaries are only attached on the direct OpenAI provider.
 * `reasoningSummary: null` is sent explicitly so effort above `none` does not
 * pick up the provider's default summary.
 */
export function resolveTransport(
  provider: AiTransport,
  modelId: string,
  hasOverride: boolean,
): AiTransport {
  if (!hasOverride) return provider
  const slash = modelId.indexOf("/")
  if (slash === -1) return "openai"
  return modelId.slice(0, slash) === "openai" ? "openai" : "gateway"
}

export function aiTaskTransport(id: AiTaskId): AiTransport {
  const task = aiTask(id)
  const override = readOverride(task)
  return resolveTransport(task.provider, override || task.modelId, Boolean(override))
}

/**
 * 503 guard for a task. OpenAI tasks need `OPENAI_API_KEY`. Gateway tasks need
 * `AI_GATEWAY_API_KEY`, or `VERCEL_OIDC_TOKEN` when that key is unset. A
 * non-empty placeholder key does not fall through to OIDC, because the
 * gateway SDK will send it and will not replace it.
 */
export function assertAiTaskConfigured(
  id: AiTaskId,
): { error: typeof AI_UNAVAILABLE_ERROR } | null {
  if (aiTaskTransport(id) === "gateway") {
    return gatewayAuthAvailable() ? null : { error: AI_UNAVAILABLE_ERROR }
  }
  return getOpenAiAvailabilityError()
}

export function resolveAiTask(id: AiTaskId): ResolvedAiTask {
  const task = aiTask(id)
  const override = readOverride(task)
  if (override && task.env) warnIfRetiredModelOverride(task.env, override)

  const modelId = override || task.modelId
  const gateway = resolveTransport(task.provider, modelId, Boolean(override)) === "gateway"
  const model = gateway ? modelId : openai(modelId.replace(/^openai\//, ""))

  const resolved: ResolvedAiTask = { model }
  if (task.reasoning) resolved.reasoning = task.reasoning
  if (
    task.temperature != null &&
    (task.reasoning == null || task.reasoning === "none")
  ) {
    resolved.temperature = task.temperature
  }
  if (task.maxOutputTokens != null) {
    resolved.maxOutputTokens = task.maxOutputTokens
  }
  if (!gateway && task.reasoning && task.reasoning !== "none" && task.reasoningSummary !== undefined) {
    resolved.providerOptions = {
      openai: { reasoningSummary: task.reasoningSummary },
    }
  }
  if (gateway && task.reasoning && task.reasoning !== "none") {
    warnGatewayReasoning(task, modelId)
  }
  return resolved
}

function readOverride(task: AiTask): string | undefined {
  if (!task.env) return undefined
  const value = process.env[task.env]?.trim()
  return value || undefined
}

function gatewayAuthAvailable(): boolean {
  const key = process.env.AI_GATEWAY_API_KEY
  if (typeof key === "string" && key.trim()) {
    return !isPlaceholderOpenAiApiKey(key)
  }
  const oidc = process.env.VERCEL_OIDC_TOKEN
  return typeof oidc === "string" && oidc.trim().length > 0
}

const warnedGatewayReasoning = new Set<string>()

function warnGatewayReasoning(task: AiTask, modelId: string) {
  const provider = modelId.slice(0, modelId.indexOf("/"))
  if (provider === "openai" || provider.length === 0) return
  const key = `${task.env ?? task.id}:${modelId}`
  if (warnedGatewayReasoning.has(key)) return
  warnedGatewayReasoning.add(key)
  console.warn(
    `${task.env ?? task.id} uses gateway model ${modelId}. ` +
      `Reasoning effort "${task.reasoning}" is still sent; that provider may ignore it. ` +
      "OpenAI reasoning summaries are not attached to a non-OpenAI gateway model.",
  )
}
