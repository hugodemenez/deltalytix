import { afterEach, describe, expect, it, vi } from "vitest"
import { aiNormalizeTrades } from "./ai-import"

const MAPPING = {
  accountNumber: null,
  instrument: "Symbol",
  entryId: null,
  closeId: null,
  quantity: "Qty",
  entryPrice: "Entry",
  closePrice: "Exit",
  entryDate: "Entry time",
  closeDate: "Exit time",
  pnl: "Profit",
  timeInPosition: null,
  side: "Side",
  commission: "Commission",
}

const MODEL_TRADE = {
  quantity: 2.5,
  pnl: -12.34,
  commission: 1.25,
  timeInPosition: 90,
  side: "short" as const,
  entryDate: "2026-01-02T15:04:05.000Z",
  closeDate: "2026-01-02T15:05:35.000Z",
  instrument: "ES",
  accountNumber: "",
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

function responsesMessage(text: string) {
  return {
    id: "resp_synthetic",
    created_at: 1_700_000_000,
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
      output_tokens: 20,
      output_tokens_details: { reasoning_tokens: 0 },
    },
  }
}

describe("aiNormalizeTrades", () => {
  it("returns no trades and does not call the model for an empty file", async () => {
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock as typeof fetch
    await expect(
      aiNormalizeTrades({
        headers: ["Symbol"],
        objects: [],
        accountNumber: "ACC-1",
      }),
    ).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("keeps pnl and quantity exactly and forces the account number", async () => {
    process.env.OPENAI_API_KEY = "sk-test-not-a-real-key"
    const captured: Captured[] = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      captured.push({ url, body })
      const text =
        captured.length === 1
          ? JSON.stringify(MAPPING)
          : JSON.stringify([MODEL_TRADE])
      return new Response(JSON.stringify(responsesMessage(text)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }) as typeof fetch

    const trades = await aiNormalizeTrades({
      headers: ["Symbol", "Qty", "Profit", "Entry", "Exit", "Side", "Commission", "Entry time", "Exit time"],
      objects: [
        {
          Symbol: "ES",
          Qty: "2.5",
          Profit: "-12.34",
          Entry: "5000.25",
          Exit: "4995.50",
          Side: "short",
          Commission: "1.25",
          "Entry time": "2026-01-02 15:04:05",
          "Exit time": "2026-01-02 15:05:35",
        },
      ],
      accountNumber: "ACC-9",
    })

    expect(captured).toHaveLength(2)
    for (const call of captured) {
      expect(call.url).toContain("/responses")
      expect(call.body.model).toBe("gpt-6-luna")
      expect(call.body.temperature).toBe(0.1)
      expect(call.body.reasoning).toEqual({ effort: "none" })
    }
    const tradeItems = (
      captured[1]?.body.text as {
        format?: {
          schema?: {
            type?: string
            items?: { properties?: Record<string, { type?: string }> }
          }
        }
      }
    ).format?.schema
    expect(tradeItems?.type).toBe("array")
    expect(tradeItems?.items?.properties?.pnl?.type).toBe("number")
    expect(tradeItems?.items?.properties?.quantity?.type).toBe("number")

    expect(trades).toHaveLength(1)
    expect(trades[0]?.pnl).toBe(-12.34)
    expect(trades[0]?.quantity).toBe(2.5)
    expect(trades[0]?.commission).toBe(1.25)
    expect(trades[0]?.entryPrice).toBe("5000.25")
    expect(trades[0]?.closePrice).toBe("4995.50")
    expect(trades[0]?.instrument).toBe("ES")
    expect(trades[0]?.side).toBe("short")
    expect(trades[0]?.accountNumber).toBe("ACC-9")
    expect(trades[0]?.tags).toEqual(["ai-import"])
  })
})
