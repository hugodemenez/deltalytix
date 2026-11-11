import { afterEach, describe, expect, it, vi } from "vitest"
import { ANALYSIS_ACCOUNTS_MODEL_LABEL } from "./model-label"
import { CHEAPEST_OPENAI_MODEL_ID } from "./openai-generation"
import {
  aiTaskUnavailableResponse,
  resolveAiTask,
  resolveTransport,
} from "./resolve-ai-task"
import { AI_TASKS, type AiTask, type AiTaskId } from "./tasks"

const ENV_KEYS = [
  "SUPPORT_AGENT_MODEL",
  "LANDING_FAQ_MODEL",
  "REASONING_LABEL_TRANSLATE_MODEL",
  "WEEKLY_ANALYSIS_MODEL",
  "OPENAI_API_KEY",
  "AI_GATEWAY_API_KEY",
  "VERCEL_OIDC_TOKEN",
] as const

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

describe("resolveTransport", () => {
  it("follows the registry provider when there is no override", () => {
    expect(resolveTransport("openai", "perplexity/sonar", false)).toBe("openai")
    expect(resolveTransport("gateway", "gpt-6-luna", false)).toBe("gateway")
  })

  it("routes an override by its prefix", () => {
    expect(resolveTransport("openai", "gpt-6-luna", true)).toBe("openai")
    expect(resolveTransport("gateway", "openai/gpt-6-luna", true)).toBe("openai")
    expect(resolveTransport("openai", "perplexity/sonar", true)).toBe("gateway")
  })
})

describe("resolveAiTask", () => {
  it("resolves every task onto its registry default", () => {
    for (const key of ENV_KEYS) delete process.env[key]
    for (const id of Object.keys(AI_TASKS) as AiTaskId[]) {
      const task: AiTask = AI_TASKS[id]
      const resolved = resolveAiTask(id)
      expect(modelIdOf(resolved.model)).toBe(task.modelId)
      expect(typeof resolved.model === "string").toBe(task.provider === "gateway")
      expect(resolved.reasoning).toBe(task.reasoning)
      const temperature =
        task.temperature != null && (task.reasoning == null || task.reasoning === "none")
          ? task.temperature
          : undefined
      expect(resolved.temperature).toBe(temperature)
      expect(resolved.maxOutputTokens).toBe(task.maxOutputTokens)
      if (
        task.provider === "openai" &&
        task.reasoning &&
        task.reasoning !== "none" &&
        task.reasoningSummary !== undefined
      ) {
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

  it("keeps effort on a non-OpenAI gateway override and warns once", () => {
    process.env.WEEKLY_ANALYSIS_MODEL = "perplexity/sonar"
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const resolved = resolveAiTask("weekly-recap")
    expect(resolved.model).toBe("perplexity/sonar")
    expect(resolved.reasoning).toBe("high")
    expect(resolved.providerOptions).toBeUndefined()
    expect(resolved.maxOutputTokens).toBe(4000)
    expect(warn).toHaveBeenCalledOnce()
    expect(String(warn.mock.calls[0]?.[0])).toContain("perplexity/sonar")
    resolveAiTask("weekly-recap")
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})

describe("aiTaskUnavailableResponse", () => {
  it("requires an OpenAI key for a direct task and ignores a gateway key", () => {
    process.env.OPENAI_API_KEY = "dummy"
    process.env.AI_GATEWAY_API_KEY = "gw-live"
    expect(aiTaskUnavailableResponse("support")).toEqual({ error: "AI_UNAVAILABLE" })
    process.env.OPENAI_API_KEY = "sk-live"
    expect(aiTaskUnavailableResponse("support")).toBeNull()
  })

  it("requires gateway auth for a gateway task, including Vercel OIDC when the key is unset", () => {
    delete process.env.AI_GATEWAY_API_KEY
    delete process.env.VERCEL_OIDC_TOKEN
    process.env.OPENAI_API_KEY = "sk-live"
    expect(aiTaskUnavailableResponse("editor-explain")).toEqual({ error: "AI_UNAVAILABLE" })
    process.env.VERCEL_OIDC_TOKEN = "oidc-token"
    expect(aiTaskUnavailableResponse("editor-explain")).toBeNull()
    process.env.AI_GATEWAY_API_KEY = "dummy"
    expect(aiTaskUnavailableResponse("editor-explain")).toEqual({ error: "AI_UNAVAILABLE" })
  })

  it("accepts the request OIDC header that @vercel/oidc reads before the env var", () => {
    delete process.env.AI_GATEWAY_API_KEY
    delete process.env.VERCEL_OIDC_TOKEN
    const symbol = Symbol.for("@vercel/request-context")
    const previous = (globalThis as Record<symbol, unknown>)[symbol]
    ;(globalThis as Record<symbol, unknown>)[symbol] = {
      get: () => ({ headers: { "x-vercel-oidc-token": "header-token" } }),
    }
    try {
      expect(aiTaskUnavailableResponse("editor-explain")).toBeNull()
    } finally {
      if (previous === undefined) {
        delete (globalThis as Record<symbol, unknown>)[symbol]
      } else {
        ;(globalThis as Record<symbol, unknown>)[symbol] = previous
      }
    }
  })

  it("follows a gateway override instead of OPENAI_API_KEY", () => {
    process.env.OPENAI_API_KEY = "dummy"
    process.env.LANDING_FAQ_MODEL = "perplexity/sonar"
    delete process.env.AI_GATEWAY_API_KEY
    delete process.env.VERCEL_OIDC_TOKEN
    expect(aiTaskUnavailableResponse("landing-faq")).toEqual({ error: "AI_UNAVAILABLE" })
    process.env.AI_GATEWAY_API_KEY = "gw-live"
    expect(aiTaskUnavailableResponse("landing-faq")).toBeNull()
  })
})

describe("analysis accounts model id", () => {
  it("uses the shared cheapest model id the client label re-exports", () => {
    expect(AI_TASKS["analysis-accounts"].modelId).toBe(CHEAPEST_OPENAI_MODEL_ID)
    expect(ANALYSIS_ACCOUNTS_MODEL_LABEL).toBe(CHEAPEST_OPENAI_MODEL_ID)
  })
})
