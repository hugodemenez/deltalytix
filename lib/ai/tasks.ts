import { ANALYSIS_ACCOUNTS_MODEL_LABEL } from "@/lib/ai/model-label"
import { CHEAPEST_OPENAI_MODEL_ID } from "@/lib/ai/openai-generation"

/**
 * One registry for every generation task.
 *
 * Defaults are the cheapest settings that stay defensible without a live
 * eval (`bun run test:e2e:models`). gpt-6-luna is the published replacement
 * for the retired generation models and the lowest list price of the current
 * family ($0.10 input / $0.50 output per 1M). Effort `none` is used wherever
 * the task is extraction or a short tool-routed reply, because that is the
 * only effort that can be combined with temperature.
 *
 * Two tasks stay above `none`:
 * - `weekly-recap` is effort `high`. The Sep 6 2026 one-day recap invented a
 *   multi-day ramp when the model answered without reasoning.
 * - `support` is effort `low` with a reasoning summary. The support page
 *   renders thought-process rows, and the French title translator reads the
 *   first line of that summary. Effort `none` produces no summary, so
 *   `sendReasoning` would stream nothing.
 *
 * Output caps are only on short responses. Trade batches and tool-calling
 * agents are uncapped so a limit cannot cut a tool-call argument or a row.
 *
 * `resolveAiTask` (server-only) turns a task id into streamText/generateText
 * settings and applies the optional env override named here.
 */
export const AI_REASONING_EFFORTS = [
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const

export type AiReasoningEffort = (typeof AI_REASONING_EFFORTS)[number]

export type AiTaskId =
  | "import-format"
  | "import-mapping"
  | "mappings"
  | "import-parse-plan"
  | "date-search"
  | "format-name"
  | "newsletter"
  | "youtube-summary"
  | "editor-explain"
  | "editor-suggest-question"
  | "editor-journal"
  | "chat"
  | "support"
  | "reasoning-label"
  | "landing-faq"
  | "analysis-global"
  | "analysis-instrument"
  | "analysis-time-of-day"
  | "analysis-accounts"
  | "analysis-component"
  | "weekly-recap"

export type AiTaskEnv =
  | "SUPPORT_AGENT_MODEL"
  | "LANDING_FAQ_MODEL"
  | "REASONING_LABEL_TRANSLATE_MODEL"
  | "WEEKLY_ANALYSIS_MODEL"

export type AiTask = {
  id: AiTaskId
  modelId: string
  provider: "openai" | "gateway"
  reasoning?: AiReasoningEffort
  temperature?: number
  maxOutputTokens?: number
  reasoningSummary?: "auto" | "detailed" | null
  env?: AiTaskEnv
  why: string
}

const luna = CHEAPEST_OPENAI_MODEL_ID

export const AI_TASKS = {
  "import-format": {
    id: "import-format",
    modelId: luna,
    provider: "openai",
    reasoning: "none",
    temperature: 0.1,
    why: "CSV rows become trades inside the import path. Effort none keeps temperature for stable numbers. Uncapped so a 50-row batch is not cut off. The old /api/ai/format-trades HTTP route had no caller and was removed.",
  },
  "import-mapping": {
    id: "import-mapping",
    modelId: luna,
    provider: "openai",
    reasoning: "none",
    temperature: 0.1,
    maxOutputTokens: 800,
    why: "Column-to-field object. Short JSON, so the cap sits above one string per field.",
  },
  mappings: {
    id: "mappings",
    modelId: luna,
    provider: "openai",
    reasoning: "none",
    temperature: 0,
    maxOutputTokens: 800,
    why: "Header mapping is a small object. Temperature 0 and a short cap.",
  },
  "import-parse-plan": {
    id: "import-parse-plan",
    modelId: luna,
    provider: "openai",
    reasoning: "none",
    temperature: 0,
    maxOutputTokens: 800,
    why: "Closed-trades vs orders plan. Deterministic short JSON.",
  },
  "date-search": {
    id: "date-search",
    modelId: luna,
    provider: "openai",
    reasoning: "none",
    temperature: 0,
    maxOutputTokens: 200,
    why: "A date range or a weekday list. The JSON is a handful of fields.",
  },
  "format-name": {
    id: "format-name",
    modelId: luna,
    provider: "openai",
    reasoning: "none",
    temperature: 0,
    maxOutputTokens: 2000,
    why: "Infer names from at most 20 emails. The route rejects a larger batch with 400 so this 2000-token cap cannot truncate the JSON into a 500.",
  },
  newsletter: {
    id: "newsletter",
    modelId: luna,
    provider: "openai",
    reasoning: "none",
    temperature: 0.3,
    maxOutputTokens: 900,
    why: "French subject, intro, and a short feature list. Effort none with a little temperature.",
  },
  "youtube-summary": {
    id: "youtube-summary",
    modelId: luna,
    provider: "openai",
    reasoning: "none",
    temperature: 0.3,
    maxOutputTokens: 700,
    why: "The prompt asks for 150–200 words. 700 tokens covers that plus the JSON wrapper.",
  },
  "editor-explain": {
    id: "editor-explain",
    modelId: "perplexity/sonar",
    provider: "gateway",
    temperature: 0.3,
    maxOutputTokens: 400,
    why: "Web search stays on Perplexity. Not an OpenAI reasoning call. Two to four sentences.",
  },
  "editor-suggest-question": {
    id: "editor-suggest-question",
    modelId: luna,
    provider: "openai",
    reasoning: "none",
    temperature: 0.7,
    maxOutputTokens: 200,
    why: "One reflection question. Higher temperature, still effort none so temperature is sent.",
  },
  "editor-journal": {
    id: "editor-journal",
    modelId: luna,
    provider: "openai",
    reasoning: "none",
    temperature: 0.3,
    maxOutputTokens: 800,
    why: "Improve and day-summary replies are short. Effort none keeps the temperature.",
  },
  chat: {
    id: "chat",
    modelId: luna,
    provider: "openai",
    reasoning: "none",
    why: "Tool routing over the trader's data. Effort none is enough, and there is no output cap so tool-call arguments are not truncated.",
  },
  support: {
    id: "support",
    modelId: luna,
    provider: "openai",
    reasoning: "low",
    reasoningSummary: "auto",
    env: "SUPPORT_AGENT_MODEL",
    why: "Effort low with an OpenAI reasoning summary so the support page thought-process rows and the French title translator still receive text. No temperature: effort is not none. No output cap, so codebase tool arguments are not cut.",
  },
  "reasoning-label": {
    id: "reasoning-label",
    modelId: luna,
    provider: "openai",
    reasoning: "none",
    maxOutputTokens: 80,
    env: "REASONING_LABEL_TRANSLATE_MODEL",
    why: "Translates one short reasoning title. Effort none and a tight cap; the summary itself comes from the support task.",
  },
  "landing-faq": {
    id: "landing-faq",
    modelId: luna,
    provider: "openai",
    reasoning: "none",
    maxOutputTokens: 280,
    env: "LANDING_FAQ_MODEL",
    why: "A short answer grounded in the published FAQ. Effort none, capped so it cannot wander into a long essay.",
  },
  "analysis-global": {
    id: "analysis-global",
    modelId: luna,
    provider: "openai",
    reasoning: "none",
    why: "Tool-routed portfolio analysis. Effort none, uncapped so tool arguments survive.",
  },
  "analysis-instrument": {
    id: "analysis-instrument",
    modelId: luna,
    provider: "openai",
    reasoning: "none",
    why: "Tool-routed instrument analysis. Same cheap settings as the other analysis routes.",
  },
  "analysis-time-of-day": {
    id: "analysis-time-of-day",
    modelId: luna,
    provider: "openai",
    reasoning: "none",
    why: "Tool-routed time-of-day analysis. Same cheap settings as the other analysis routes.",
  },
  "analysis-accounts": {
    id: "analysis-accounts",
    modelId: ANALYSIS_ACCOUNTS_MODEL_LABEL,
    provider: "openai",
    reasoning: "none",
    why: "Account chat plus tools. Effort none. The accounts page label is ANALYSIS_ACCOUNTS_MODEL_LABEL, not this module.",
  },
  "analysis-component": {
    id: "analysis-component",
    modelId: luna,
    provider: "openai",
    reasoning: "none",
    why: "Four short sections (summary, strengths, improvements, recommendations) inside a tool. Effort none.",
  },
  "weekly-recap": {
    id: "weekly-recap",
    modelId: luna,
    provider: "openai",
    reasoning: "high",
    reasoningSummary: null,
    maxOutputTokens: 4000,
    env: "WEEKLY_ANALYSIS_MODEL",
    why: "One sentence plus ~18 words, but effort high: the Sep 6 2026 one-day recap invented a ramp without reasoning. Reasoning tokens count toward max output, so the cap is 4000 rather than a few hundred. reasoningSummary is null so the provider does not also emit a detailed summary into that budget. No temperature.",
  },
} satisfies Record<AiTaskId, AiTask>

export function aiTask(id: AiTaskId): AiTask {
  return AI_TASKS[id]
}
