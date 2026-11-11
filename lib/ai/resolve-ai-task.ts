import "server-only"

import { openai } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"
import { warnIfRetiredModelOverride } from "@/lib/ai/openai-generation"
import {
  aiTask,
  type AiReasoningEffort,
  type AiTask,
  type AiTaskId,
} from "@/lib/ai/tasks"

export type ResolvedAiTask = {
  model: LanguageModel
  reasoning?: AiReasoningEffort
  temperature?: number
  maxOutputTokens?: number
  providerOptions?: {
    openai: { reasoningSummary: NonNullable<AiTask["reasoningSummary"]> }
  }
}

/**
 * Env overrides (`SUPPORT_AGENT_MODEL`, `LANDING_FAQ_MODEL`,
 * `REASONING_LABEL_TRANSLATE_MODEL`, `WEEKLY_ANALYSIS_MODEL`):
 *
 * - `provider/model` whose provider is not `openai` (for example
 *   `perplexity/sonar`) is passed through as an AI Gateway model id, which is
 *   what these variables did before calls moved to the direct OpenAI provider.
 *   OpenAI reasoning effort and reasoning summaries are not attached to that
 *   override. Temperature and maxOutputTokens still apply.
 * - `openai/<id>` and a bare id use the direct OpenAI provider, with this
 *   task's effort, temperature, and summary. A retired id logs one warning.
 */
export function resolveAiTask(id: AiTaskId): ResolvedAiTask {
  const task = aiTask(id)
  const override = task.env ? process.env[task.env]?.trim() : undefined
  if (override && task.env) warnIfRetiredModelOverride(task.env, override)

  const modelId = override || task.modelId
  const gateway = isGatewayModel(modelId, task, Boolean(override))
  const model = gateway ? modelId : openai(modelId.replace(/^openai\//, ""))

  const resolved: ResolvedAiTask = { model }
  if (!gateway && task.reasoning) resolved.reasoning = task.reasoning
  if (
    task.temperature != null &&
    (gateway || task.reasoning == null || task.reasoning === "none")
  ) {
    resolved.temperature = task.temperature
  }
  if (task.maxOutputTokens != null) {
    resolved.maxOutputTokens = task.maxOutputTokens
  }
  if (
    !gateway &&
    task.reasoning &&
    task.reasoning !== "none" &&
    task.reasoningSummary
  ) {
    resolved.providerOptions = {
      openai: { reasoningSummary: task.reasoningSummary },
    }
  }
  return resolved
}

function isGatewayModel(
  modelId: string,
  task: AiTask,
  hasOverride: boolean,
): boolean {
  const slash = modelId.indexOf("/")
  if (slash === -1) return !hasOverride && task.provider === "gateway"
  return modelId.slice(0, slash) !== "openai"
}
