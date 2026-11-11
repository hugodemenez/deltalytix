/**
 * Synthetic Responses fixtures shaped for @ai-sdk/openai 3.0.70.
 * They check the serialized request and the SDK parser. They are not
 * recordings of gpt-6-luna and they are not a model-quality eval.
 */
import { generateObject, generateText, stepCountIs, streamText, tool } from "ai"
import { openai } from "@ai-sdk/openai"
import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod/v3"
import { tradeSchema } from "@/app/api/ai/format-trades/schema"
import {
  GPT6_LUNA_GATEWAY_MODEL,
  GPT6_LUNA_MODEL_ID,
  TOOL_AGENT_MODEL,
  createGpt6LunaCompatibleFetch,
  ensureGpt6LunaCompatibleRequestBody,
  gatewayReasoning,
  gpt6LunaModel,
  lunaReasoning,
  retiredOpenAiGenerationModel,
  samplingWithReasoningNone,
  warnIfRetiredModelOverride,
} from "./openai-generation"

const SYNTHETIC_TRADE = {
  quantity: 2.5,
  pnl: -12.34,
  commission: 1.25,
  timeInPosition: 90,
  side: "short" as const,
  entryDate: "2026-01-02T15:04:05.000Z",
  closeDate: "2026-01-02T15:05:35.000Z",
  instrument: "ES",
  accountNumber: "SYNTH",
  entryPrice: "5000.25",
  closePrice: "4995.50",
}

type Captured = { url: string; body: Record<string, unknown> }

const originalFetch = globalThis.fetch
const originalKey = process.env.OPENAI_API_KEY

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = originalKey
})

function installFetch(handler: (captured: Captured) => Response) {
  process.env.OPENAI_API_KEY = "sk-test-not-a-real-key"
  const captured: Captured[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    const raw = typeof init?.body === "string" ? init.body : ""
    const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    const record = { url, body }
    captured.push(record)
    return handler(record)
  }) as typeof fetch
  return captured
}

function responsesMessage(text: string) {
  return {
    id: "resp_synthetic",
    created_at: 1_700_000_000,
    model: GPT6_LUNA_MODEL_ID,
    output: [
      {
        type: "message",
        role: "assistant",
        id: "msg_synthetic",
        content: [{ type: "output_text", text, annotations: [] }],
      },
    ],
    usage: {
      input_tokens: 12,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens: 20,
      output_tokens_details: { reasoning_tokens: 0 },
    },
  }
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

function textStreamEvents(text: string, id = "msg_stream") {
  return [
    {
      type: "response.output_item.added",
      output_index: 0,
      item: { type: "message", id },
    },
    {
      type: "response.output_text.delta",
      item_id: id,
      delta: text,
    },
    {
      type: "response.output_item.done",
      output_index: 0,
      item: { type: "message", id },
    },
    {
      type: "response.completed",
      response: {
        usage: {
          input_tokens: 8,
          output_tokens: 9,
          output_tokens_details: { reasoning_tokens: 0 },
        },
      },
    },
  ]
}

function sseResponse(events: unknown[]) {
  const payload =
    events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") +
    "data: [DONE]\n\n"
  return new Response(payload, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  })
}

describe("ensureGpt6LunaCompatibleRequestBody", () => {
  it("adds reasoning effort none when gpt-6-luna would otherwise keep temperature", () => {
    const next = ensureGpt6LunaCompatibleRequestBody({
      model: GPT6_LUNA_MODEL_ID,
      temperature: 0.1,
      input: "format trades",
    }) as { temperature: number; reasoning: { effort: string } }

    expect(next.temperature).toBe(0.1)
    expect(next.reasoning).toEqual({ effort: "none" })
  })

  it("keeps a serialized non-none effort and drops the incompatible temperature", () => {
    const next = ensureGpt6LunaCompatibleRequestBody({
      model: GPT6_LUNA_MODEL_ID,
      temperature: 0.1,
      reasoning: { effort: "low" },
    }) as { temperature?: number; reasoning: { effort: string } }

    expect(next.reasoning).toEqual({ effort: "low" })
    expect(next.temperature).toBeUndefined()
  })

  it("leaves other models, including weekly-recap luna, unchanged", () => {
    const body = {
      model: "gpt-5.6-luna",
      temperature: 0.2,
    }
    expect(ensureGpt6LunaCompatibleRequestBody(body)).toBe(body)
  })

  it("does not rewrite an unpublished dated snapshot id", () => {
    const body = {
      model: "gpt-6-luna-2026-11-11",
      temperature: 0.1,
    }
    expect(ensureGpt6LunaCompatibleRequestBody(body)).toBe(body)
  })

  it("does not invent effort none when the body has no sampling parameter", () => {
    const body = { model: GPT6_LUNA_MODEL_ID, input: "analysis" }
    expect(ensureGpt6LunaCompatibleRequestBody(body)).toBe(body)
  })

  it("strips sampling parameters when a non-none effort is already on the body", () => {
    const next = ensureGpt6LunaCompatibleRequestBody({
      model: GPT6_LUNA_MODEL_ID,
      temperature: 0.4,
      top_p: 0.9,
      top_logprobs: 3,
      reasoning: { effort: "medium" },
    }) as Record<string, unknown>

    expect(next.temperature).toBeUndefined()
    expect(next.top_p).toBeUndefined()
    expect(next.top_logprobs).toBeUndefined()
    expect(next.reasoning).toEqual({ effort: "medium" })
  })
})

describe("serialized OpenAI Responses requests", () => {
  it("stock @ai-sdk/openai 3.0.70 sends temperature without reasoning effort for gpt-6-luna", async () => {
    const captured = installFetch(() => jsonResponse(responsesMessage("{}")))

    await generateObject({
      model: openai(GPT6_LUNA_MODEL_ID),
      schema: z.object({ ok: z.boolean() }),
      prompt: "synthetic",
      temperature: 0.1,
      providerOptions: {
        openai: { reasoningEffort: "none" },
      },
    }).catch(() => undefined)

    expect(captured).toHaveLength(1)
    expect(captured[0]?.url).toContain("/responses")
    expect(captured[0]?.body.model).toBe(GPT6_LUNA_MODEL_ID)
    expect(captured[0]?.body.temperature).toBe(0.1)
    expect(captured[0]?.body.reasoning).toBeUndefined()
    expect(captured[0]?.body.reasoning_effort).toBeUndefined()
  })

  it("keeps temperature 0.1 with reasoning effort none and a strict trade schema", async () => {
    const captured = installFetch(() =>
      jsonResponse(responsesMessage(JSON.stringify([SYNTHETIC_TRADE]))),
    )

    const { object } = await generateObject({
      model: gpt6LunaModel(),
      schema: z.array(tradeSchema),
      prompt: "Format this synthetic row. Do not invent fields.",
      ...samplingWithReasoningNone(0.1),
    })

    expect(captured[0]?.url).toContain("/responses")
    expect(captured[0]?.body.model).toBe(GPT6_LUNA_MODEL_ID)
    expect(captured[0]?.body.temperature).toBe(0.1)
    expect(captured[0]?.body.reasoning).toEqual({ effort: "none" })
    const format = (
      captured[0]?.body.text as {
        format?: {
          type?: string
          schema?: {
            type?: string
            items?: { properties?: Record<string, { type?: string }> }
          }
        }
      }
    ).format
    expect(format?.type).toBe("json_schema")
    expect(format?.schema?.type).toBe("array")
    expect(format?.schema?.items?.properties?.pnl?.type).toBe("number")
    expect(format?.schema?.items?.properties?.quantity?.type).toBe("number")
    expect(object).toEqual([SYNTHETIC_TRADE])
    expect(object[0]?.pnl).toBe(-12.34)
    expect(object[0]?.quantity).toBe(2.5)
  })

  it("streams text and tools with temperature 0.3 and reasoning effort none", async () => {
    const captured = installFetch(() =>
      sseResponse(textStreamEvents("ES short, pnl -12.34, quantity 2.5.")),
    )

    const result = streamText({
      model: gpt6LunaModel(),
      prompt: "Summarize the synthetic day.",
      ...samplingWithReasoningNone(0.3),
      tools: {
        getDayData: tool({
          description: "Synthetic day data. Not executed in this test.",
          inputSchema: z.object({ date: z.string() }),
        }),
      },
    })

    await expect(result.text).resolves.toBe(
      "ES short, pnl -12.34, quantity 2.5.",
    )

    expect(captured[0]?.url).toContain("/responses")
    expect(captured[0]?.body.model).toBe(GPT6_LUNA_MODEL_ID)
    expect(captured[0]?.body.temperature).toBe(0.3)
    expect(captured[0]?.body.reasoning).toEqual({ effort: "none" })
    const tools = captured[0]?.body.tools as Array<{ name?: string; type?: string }>
    expect(tools.map((item) => item.name ?? item.type)).toContain("getDayData")
  })

  it("analysis-style calls omit temperature and still pin effort to none", async () => {
    const captured = installFetch(() =>
      sseResponse(textStreamEvents("No sampling parameter on this call.")),
    )

    const result = streamText({
      model: gpt6LunaModel(),
      prompt: "synthetic analysis",
      ...lunaReasoning("none"),
      tools: {
        getOverallPerformanceMetrics: tool({
          description: "Synthetic metrics tool.",
          inputSchema: z.object({}),
        }),
      },
    })

    await expect(result.text).resolves.toContain("No sampling parameter")
    expect(captured[0]?.body.temperature).toBeUndefined()
    expect(captured[0]?.body.top_p).toBeUndefined()
    expect(captured[0]?.body.reasoning).toEqual({ effort: "none" })
  })

  it.each(["low", "medium"] as const)(
    "forceReasoning %s strips temperature and topP and keeps that effort",
    async (effort) => {
      const captured = installFetch(() => jsonResponse(responsesMessage("ok")))

      await generateText({
        model: gpt6LunaModel(),
        prompt: "synthetic",
        temperature: 0.7,
        topP: 0.9,
        ...lunaReasoning(effort),
      })

      expect(captured[0]?.body.reasoning).toEqual({ effort })
      expect(captured[0]?.body.temperature).toBeUndefined()
      expect(captured[0]?.body.top_p).toBeUndefined()
    },
  )

  it("bare reasoningEffort low is dropped by 3.0.70 and is not rewritten to none", async () => {
    const captured = installFetch(() => jsonResponse(responsesMessage("ok")))

    await generateText({
      model: gpt6LunaModel(),
      prompt: "synthetic",
      providerOptions: { openai: { reasoningEffort: "low" } },
    })

    expect(captured[0]?.body.reasoning).toBeUndefined()
    expect(captured[0]?.body.temperature).toBeUndefined()
  })

  it("replays a synthetic tool result into a second request with the same sampling", async () => {
    let calls = 0
    const captured = installFetch(() => {
      calls += 1
      if (calls === 1) {
        return sseResponse([
          {
            type: "response.output_item.added",
            output_index: 0,
            item: {
              type: "function_call",
              id: "fc_synthetic",
              call_id: "call_synthetic",
              name: "getDayData",
              arguments: "{\"date\":\"2026-01-02\"}",
            },
          },
          {
            type: "response.output_item.done",
            output_index: 0,
            item: {
              type: "function_call",
              id: "fc_synthetic",
              call_id: "call_synthetic",
              name: "getDayData",
              arguments: "{\"date\":\"2026-01-02\"}",
              status: "completed",
            },
          },
          {
            type: "response.completed",
            response: {
              usage: {
                input_tokens: 8,
                output_tokens: 9,
                output_tokens_details: { reasoning_tokens: 0 },
              },
            },
          },
        ])
      }
      return sseResponse(textStreamEvents("Follow-up after the synthetic tool."))
    })

    const result = streamText({
      model: gpt6LunaModel(),
      prompt: "Summarize the synthetic day.",
      ...samplingWithReasoningNone(0.1),
      stopWhen: stepCountIs(2),
      tools: {
        getDayData: tool({
          description: "Synthetic day data.",
          inputSchema: z.object({ date: z.string() }),
          execute: async () => ({ pnl: -12.34, quantity: 2.5 }),
        }),
      },
    })

    await expect(result.text).resolves.toBe("Follow-up after the synthetic tool.")
    expect(captured).toHaveLength(2)
    for (const request of captured) {
      expect(request.body.model).toBe(GPT6_LUNA_MODEL_ID)
      expect(request.body.temperature).toBe(0.1)
      expect(request.body.reasoning).toEqual({ effort: "none" })
    }
    expect(JSON.stringify(captured[1]?.body.input)).toContain("call_synthetic")
    expect(JSON.stringify(captured[1]?.body.input)).toContain("-12.34")
  })
})

describe("createGpt6LunaCompatibleFetch", () => {
  it("rewrites only the outgoing gpt-6-luna JSON body", async () => {
    const seen: string[] = []
    const fetchImpl = createGpt6LunaCompatibleFetch(() => {
      return async (_input, init) => {
        seen.push(String(init?.body))
        return jsonResponse({ ok: true })
      }
    })

    await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      body: JSON.stringify({ model: GPT6_LUNA_MODEL_ID, temperature: 0.1 }),
    })
    await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      body: JSON.stringify({ model: "gpt-5.6-luna", temperature: 0.1 }),
    })

    expect(JSON.parse(seen[0] ?? "{}")).toMatchObject({
      model: GPT6_LUNA_MODEL_ID,
      temperature: 0.1,
      reasoning: { effort: "none" },
    })
    expect(JSON.parse(seen[1] ?? "{}")).toEqual({
      model: "gpt-5.6-luna",
      temperature: 0.1,
    })
  })
})

describe("gateway request bodies", () => {
  async function captureGateway(run: () => Promise<unknown>) {
    const originalGatewayKey = process.env.AI_GATEWAY_API_KEY
    process.env.AI_GATEWAY_API_KEY = "gw-test-not-a-real-key"
    const captured: Array<{ url: string; headers: Headers; body: Record<string, unknown> }> = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url
      captured.push({
        url,
        headers: new Headers(init?.headers),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      })
      return jsonResponse({
        content: [{ type: "text", text: "ok" }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 3, noCache: 3, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 2, text: 2, reasoning: 0 },
        },
      })
    }) as typeof fetch
    try {
      await run().catch(() => undefined)
    } finally {
      if (originalGatewayKey === undefined) delete process.env.AI_GATEWAY_API_KEY
      else process.env.AI_GATEWAY_API_KEY = originalGatewayKey
    }
    return captured
  }

  it("sends lightweight one-shots as gateway gpt-6-luna at medium with no temperature", async () => {
    const captured = await captureGateway(() =>
      generateText({
        model: GPT6_LUNA_GATEWAY_MODEL,
        prompt: "synthetic parse plan",
        providerOptions: gatewayReasoning("medium"),
      }),
    )

    expect(captured[0]?.url).toContain("ai-gateway.vercel.sh")
    expect(captured[0]?.headers.get("ai-language-model-id")).toBe(GPT6_LUNA_GATEWAY_MODEL)
    expect(captured[0]?.body.temperature).toBeUndefined()
    expect(captured[0]?.body.providerOptions).toEqual(gatewayReasoning("medium"))
    expect(JSON.stringify(captured[0]?.body.providerOptions)).not.toContain("forceReasoning")
  })

  it("sends the tool-agent model without a sampling temperature", async () => {
    const captured = await captureGateway(() =>
      generateText({
        model: TOOL_AGENT_MODEL,
        prompt: "synthetic support question",
        providerOptions: gatewayReasoning("low"),
      }),
    )

    expect(captured[0]?.headers.get("ai-language-model-id")).toBe(TOOL_AGENT_MODEL)
    expect(captured[0]?.body.temperature).toBeUndefined()
    expect(captured[0]?.body.providerOptions).toEqual(gatewayReasoning("low"))
  })

  it("forwards temperature on a gateway gpt-6-luna body instead of repairing it", async () => {
    const captured = await captureGateway(() =>
      generateText({
        model: GPT6_LUNA_GATEWAY_MODEL,
        prompt: "do not use this combination in app code",
        temperature: 0.1,
        providerOptions: gatewayReasoning("none"),
      }),
    )

    expect(captured[0]?.body.temperature).toBe(0.1)
    expect(captured[0]?.body.providerOptions).toEqual(gatewayReasoning("none"))
  })
})

describe("retired OpenAI generation ids", () => {
  it("matches only the published shutdown ids", () => {
    expect(retiredOpenAiGenerationModel("openai/gpt-5-mini")).toBe("gpt-5-mini")
    expect(retiredOpenAiGenerationModel("gpt-4o-mini-2024-07-18")).toBe(
      "gpt-4o-mini-2024-07-18",
    )
    expect(retiredOpenAiGenerationModel("gpt-5-nano-2025-08-07")).toBe(
      "gpt-5-nano-2025-08-07",
    )
    expect(retiredOpenAiGenerationModel("gpt-6-luna")).toBeNull()
    expect(retiredOpenAiGenerationModel("openai/gpt-5.6-terra")).toBeNull()
    expect(retiredOpenAiGenerationModel("gpt-4o-transcribe")).toBeNull()
    expect(retiredOpenAiGenerationModel("whisper-1")).toBeNull()
  })

  it("warns once when an override names a retired id", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    warnIfRetiredModelOverride("SUPPORT_AGENT_MODEL", "openai/gpt-5-mini")
    warnIfRetiredModelOverride("SUPPORT_AGENT_MODEL", "openai/gpt-5-mini")
    warnIfRetiredModelOverride("LANDING_FAQ_MODEL", "gpt-6-luna")
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toContain("SUPPORT_AGENT_MODEL")
    expect(String(warn.mock.calls[0]?.[0])).toContain("gpt-5-mini")
    warn.mockRestore()
  })
})
