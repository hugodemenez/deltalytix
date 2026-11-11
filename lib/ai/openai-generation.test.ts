/**
 * Synthetic Responses fixtures for @ai-sdk/openai 4.
 * They check the serialized request and the SDK parser. They are not
 * recordings of gpt-6-luna and they are not a model-quality eval.
 * Live quality checks are `bun run test:e2e:models`.
 */
import { generateText, isStepCount, Output, streamText, tool } from "ai"
import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod/v3"
import { tradeSchema } from "@/app/api/ai/format-trades/schema"
import { resolveAiTask } from "./resolve-ai-task"
import {
  CHEAPEST_OPENAI_MODEL_ID,
  retiredOpenAiGenerationModel,
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
  vi.restoreAllMocks()
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
    model: CHEAPEST_OPENAI_MODEL_ID,
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

describe("serialized OpenAI Responses requests", () => {
  it("sends temperature together with reasoning effort none for gpt-6-luna", async () => {
    const captured = installFetch(() =>
      jsonResponse(responsesMessage(JSON.stringify({ elements: [SYNTHETIC_TRADE] }))),
    )

    const { output } = await generateText({
      ...resolveAiTask("import-format"),
      output: Output.array({ element: tradeSchema }),
      prompt: "synthetic trades",
    })

    expect(captured[0]?.url).toContain("/responses")
    expect(captured[0]?.body.model).toBe(CHEAPEST_OPENAI_MODEL_ID)
    expect(captured[0]?.body.temperature).toBe(0.1)
    expect(captured[0]?.body.reasoning).toEqual({ effort: "none" })
    expect(JSON.stringify(captured[0]?.body)).not.toContain("forceReasoning")
    expect(output).toEqual([SYNTHETIC_TRADE])
  })

  it("omits temperature when effort is not none", async () => {
    const captured = installFetch(() => jsonResponse(responsesMessage("{\"ok\":true}")))

    delete process.env.SUPPORT_AGENT_MODEL
    const support = resolveAiTask("support")
    expect(support.reasoning).toBe("low")
    expect(support.temperature).toBeUndefined()
    expect(support.providerOptions).toEqual({
      openai: { reasoningSummary: "auto" },
    })

    await generateText({
      ...support,
      temperature: 0.4,
      output: Output.object({ schema: z.object({ ok: z.boolean() }) }),
      prompt: "synthetic",
    })

    expect(captured[0]?.body.reasoning).toMatchObject({
      effort: "low",
      summary: "auto",
    })
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
      ...resolveAiTask("import-format"),
      prompt: "Summarize the synthetic day.",
      stopWhen: isStepCount(2),
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
      expect(request.body.model).toBe(CHEAPEST_OPENAI_MODEL_ID)
      expect(request.body.temperature).toBe(0.1)
      expect(request.body.reasoning).toEqual({ effort: "none" })
    }
    expect(JSON.stringify(captured[1]?.body.input)).toContain("call_synthetic")
    expect(JSON.stringify(captured[1]?.body.input)).toContain("-12.34")
  })
})

describe("retired OpenAI generation ids", () => {
  it("matches official shutdown ids and ignores transcription models", () => {
    expect(retiredOpenAiGenerationModel("openai/gpt-4o-mini-2024-07-18")).toBe(
      "gpt-4o-mini-2024-07-18",
    )
    expect(retiredOpenAiGenerationModel("gpt-5-mini-2025-08-07")).toBe(
      "gpt-5-mini-2025-08-07",
    )
    expect(retiredOpenAiGenerationModel("gpt-4o-transcribe")).toBeNull()
    expect(retiredOpenAiGenerationModel("whisper-1")).toBeNull()
    expect(retiredOpenAiGenerationModel("gpt-6-luna")).toBeNull()
  })

  it("warns once per env name", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    warnIfRetiredModelOverride("SUPPORT_AGENT_MODEL", "openai/gpt-5-mini")
    warnIfRetiredModelOverride("SUPPORT_AGENT_MODEL", "openai/gpt-5-mini")
    warnIfRetiredModelOverride("LANDING_FAQ_MODEL", "gpt-6-luna")
    expect(warn).toHaveBeenCalledOnce()
    expect(String(warn.mock.calls[0]?.[0])).toContain("SUPPORT_AGENT_MODEL")
  })
})
