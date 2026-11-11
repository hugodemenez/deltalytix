import { afterEach, describe, expect, it } from "vitest"
import { resolveAiTask } from "./resolve-ai-task"
import { AI_TASKS, type AiTask, type AiTaskEnv, type AiTaskId } from "./tasks"

const ENV_KEYS: AiTaskEnv[] = [
  "SUPPORT_AGENT_MODEL",
  "LANDING_FAQ_MODEL",
  "REASONING_LABEL_TRANSLATE_MODEL",
  "WEEKLY_ANALYSIS_MODEL",
]

const previous = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
)

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = previous[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

function modelIdOf(model: { modelId?: string } | string): string {
  return typeof model === "string" ? model : (model.modelId ?? "")
}

describe("resolveAiTask", () => {
  it("resolves every task onto its registry default", () => {
    for (const key of ENV_KEYS) delete process.env[key]
    for (const id of Object.keys(AI_TASKS) as AiTaskId[]) {
      const task: AiTask = AI_TASKS[id]
      const resolved = resolveAiTask(id)
      expect(modelIdOf(resolved.model)).toBe(task.modelId)
      expect(resolved.reasoning).toBe(
        task.provider === "gateway" ? undefined : task.reasoning,
      )
      expect(resolved.temperature).toBe(task.temperature)
      expect(resolved.maxOutputTokens).toBe(task.maxOutputTokens)
      if (task.reasoning && task.reasoning !== "none" && task.reasoningSummary) {
        expect(resolved.providerOptions).toEqual({
          openai: { reasoningSummary: task.reasoningSummary },
        })
      } else {
        expect(resolved.providerOptions).toBeUndefined()
      }
    }
  })

  it("keeps a direct openai/ override on the OpenAI provider", () => {
    process.env.SUPPORT_AGENT_MODEL = "openai/gpt-5.6-luna"
    const resolved = resolveAiTask("support")
    expect(modelIdOf(resolved.model)).toBe("gpt-5.6-luna")
    expect(typeof resolved.model).not.toBe("string")
    expect(resolved.reasoning).toBe("low")
    expect(resolved.providerOptions).toEqual({
      openai: { reasoningSummary: "auto" },
    })
  })

  it("passes a non-OpenAI override through as a gateway model id", () => {
    process.env.WEEKLY_ANALYSIS_MODEL = "perplexity/sonar"
    const resolved = resolveAiTask("weekly-recap")
    expect(resolved.model).toBe("perplexity/sonar")
    expect(resolved.reasoning).toBeUndefined()
    expect(resolved.providerOptions).toBeUndefined()
    expect(resolved.maxOutputTokens).toBe(400)
  })
})
