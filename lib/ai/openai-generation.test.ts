import { generateObject, generateText, streamText, tool } from "ai"
import { openai } from "@ai-sdk/openai"
import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod/v3"
import { tradeSchema } from "@/app/api/ai/format-trades/schema"
import {
  GPT5_MINI_SUCCESSOR,
  GPT6_LUNA_MODEL_ID,
  createGpt6LunaCompatibleFetch,
  ensureGpt6LunaCompatibleRequestBody,
  gpt6LunaModel,
  samplingWithReasoningNone,
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

  it("does not override an effort the provider already serialized", () => {
    const body = {
      model: GPT6_LUNA_MODEL_ID,
      temperature: 0.1,
      reasoning: { effort: "low" },
    }
    expect(ensureGpt6LunaCompatibleRequestBody(body)).toBe(body)
  })

  it("leaves other models, including weekly-recap luna, unchanged", () => {
    const body = {
      model: "gpt-5.6-luna",
      temperature: 0.2,
    }
    expect(ensureGpt6LunaCompatibleRequestBody(body)).toBe(body)
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

  it("streams text with tools and does not send temperature beside a non-none effort", async () => {
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
      providerOptions: samplingWithReasoningNone(0).providerOptions,
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

describe("gateway sampling for gpt-5.6 successors", () => {
  it("sends temperature together with reasoning effort none", async () => {
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
      const headers = new Headers(init?.headers)
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      captured.push({ url, headers, body })
      return jsonResponse({
        content: [{ type: "text", text: "{\"ok\":true}" }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 3, noCache: 3, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 2, text: 2, reasoning: 0 },
        },
      })
    }) as typeof fetch

    try {
      await generateText({
        model: GPT5_MINI_SUCCESSOR,
        prompt: "synthetic parse plan",
        ...samplingWithReasoningNone(0),
      }).catch(() => undefined)
    } finally {
      if (originalGatewayKey === undefined) delete process.env.AI_GATEWAY_API_KEY
      else process.env.AI_GATEWAY_API_KEY = originalGatewayKey
    }

    expect(captured.length).toBeGreaterThan(0)
    expect(captured[0]?.url).toContain("ai-gateway.vercel.sh")
    expect(captured[0]?.headers.get("ai-language-model-id")).toBe(GPT5_MINI_SUCCESSOR)
    expect(captured[0]?.body.temperature).toBe(0)
    expect(
      (captured[0]?.body.providerOptions as { openai?: { reasoningEffort?: string } })
        .openai?.reasoningEffort,
    ).toBe("none")
  })
})
