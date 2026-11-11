import { afterEach, describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "./route"

const originalFetch = globalThis.fetch
const originalKey = process.env.OPENAI_API_KEY

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = originalKey
})

describe("POST /api/ai/format-trades", () => {
  it("streams a structured trade batch with a compatible Responses body", async () => {
    process.env.OPENAI_API_KEY = "sk-test-not-a-real-key"
    const trade = {
      quantity: 2.5,
      pnl: -12.34,
      commission: 1.25,
      timeInPosition: 90,
      side: "short",
      entryDate: "2026-01-02T15:04:05.000Z",
      closeDate: "2026-01-02T15:05:35.000Z",
      instrument: "ES",
      accountNumber: "ACC-9",
      entryPrice: "5000.25",
      closePrice: "4995.50",
    }
    const text = JSON.stringify({ elements: [trade] })
    let requestBody: Record<string, unknown> | undefined
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      const events = [
        {
          type: "response.output_item.added",
          output_index: 0,
          item: { type: "message", id: "msg_trades" },
        },
        {
          type: "response.output_text.delta",
          item_id: "msg_trades",
          delta: text,
        },
        {
          type: "response.output_item.done",
          output_index: 0,
          item: { type: "message", id: "msg_trades" },
        },
        {
          type: "response.completed",
          response: {
            usage: {
              input_tokens: 10,
              output_tokens: 30,
              output_tokens_details: { reasoning_tokens: 0 },
            },
          },
        },
      ]
      const payload =
        events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") +
        "data: [DONE]\n\n"
      return new Response(payload, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    }) as typeof fetch

    const response = await POST(
      new NextRequest("http://localhost/api/ai/format-trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers: ["Symbol", "Qty", "Profit"],
          rows: [["ES", "2.5", "-12.34"]],
        }),
      }),
    )

    expect(response.status).toBe(200)
    const streamed = await response.text()
    expect(requestBody?.model).toBe("gpt-6-luna")
    expect(requestBody?.temperature).toBe(0.1)
    expect(requestBody?.reasoning).toEqual({ effort: "none" })
    expect(requestBody?.stream).toBe(true)
    const format = (
      requestBody?.text as {
        format?: { type?: string; schema?: { properties?: { elements?: unknown } } }
      }
    ).format
    expect(format?.type).toBe("json_schema")
    expect(format?.schema?.properties?.elements).toBeTruthy()
    const parsed = JSON.parse(streamed) as Array<{ pnl: number; quantity: number }>
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]?.pnl).toBe(-12.34)
    expect(parsed[0]?.quantity).toBe(2.5)
    expect(streamed).not.toContain('"elements"')
  })
})
