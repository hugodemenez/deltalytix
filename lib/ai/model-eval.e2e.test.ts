/**
 * Live eval against gpt-6-luna. Synthetic fixtures only.
 *
 * Skipped unless OPENAI_API_KEY is set to a real key. Not part of `bun run test`.
 *
 *   OPENAI_API_KEY=sk-... bun run test:e2e:models
 *
 * Prints token cost from the Responses usage fields and the official
 * gpt-6-luna text price ($0.10 / $0.01 cached / $0.50 per 1M).
 */
import { generateText, isStepCount, tool } from "ai"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { z } from "zod/v3"
import { aiNormalizeTrades } from "@/lib/api/ai-import"
import { answerLandingFaqQuestion } from "@/lib/landing-faq-answer"
import { translateReasoningLabel } from "@/lib/ai/translate-reasoning-label"
import { gpt6LunaCostUsd } from "@/lib/ai/gpt6-luna-price"
import { resolveAiTask } from "@/lib/ai/resolve-ai-task"
import { AI_TASKS, type AiTask, type AiTaskId } from "@/lib/ai/tasks"
import { isPlaceholderOpenAiApiKey } from "@/lib/ai/openai-availability"
import { generateTradingAnalysis } from "@/app/api/email/weekly-summary/[userid]/actions/analysis"

const live = !isPlaceholderOpenAiApiKey(process.env.OPENAI_API_KEY)

if (!live) {
  console.log(
    "[model-eval] skipped. Set a real OPENAI_API_KEY and run: bun run test:e2e:models",
  )
}

type Usage = { input: number; cached: number; output: number }
const zero = (): Usage => ({ input: 0, cached: 0, output: 0 })
let current: Usage = zero()
const ledger: Array<Usage & { task: string; usd: number }> = []

function addUsage(usage: {
  input_tokens?: number
  output_tokens?: number
  input_tokens_details?: { cached_tokens?: number }
} | undefined) {
  if (!usage) return
  current.input += usage.input_tokens ?? 0
  current.cached += usage.input_tokens_details?.cached_tokens ?? 0
  current.output += usage.output_tokens ?? 0
}

function absorb(text: string) {
  const trimmed = text.trim()
  if (trimmed.startsWith("{")) {
    try {
      const body = JSON.parse(trimmed) as {
        usage?: Parameters<typeof addUsage>[0]
      }
      addUsage(body.usage)
      return
    } catch {
      // Fall through to SSE lines.
    }
  }
  for (const line of text.split("\n")) {
    if (!line.startsWith("data: ") || line.includes("[DONE]")) continue
    try {
      const event = JSON.parse(line.slice(6)) as {
        type?: string
        usage?: Parameters<typeof addUsage>[0]
        response?: { usage?: Parameters<typeof addUsage>[0] }
      }
      if (event.type === "response.completed" || event.usage) {
        addUsage(event.response?.usage ?? event.usage)
      }
    } catch {
      // Ignore non-JSON SSE lines.
    }
  }
}

const realFetch = globalThis.fetch

beforeAll(() => {
  if (!live) return
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await realFetch(input, init)
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    if (!url.includes("api.openai.com")) return response
    try {
      absorb(await response.clone().text())
    } catch {
      // A body that cannot be cloned still returns to the caller.
    }
    return response
  }) as typeof fetch
})

afterEach((ctx) => {
  if (!live) return
  const usd = gpt6LunaCostUsd({
    inputTokens: current.input,
    outputTokens: current.output,
    inputTokenDetails: { cacheReadTokens: current.cached },
  })
  const row = { task: ctx.task.name, ...current, usd }
  ledger.push(row)
  console.log(
    `[model-eval] ${row.task} input=${row.input} cached=${row.cached} output=${row.output} usd=${row.usd.toFixed(6)}`,
  )
  current = zero()
})

afterAll(() => {
  globalThis.fetch = realFetch
  if (!live || ledger.length === 0) return
  const usd = ledger.reduce((sum, row) => sum + row.usd, 0)
  const input = ledger.reduce((sum, row) => sum + row.input, 0)
  const output = ledger.reduce((sum, row) => sum + row.output, 0)
  console.log(
    `[model-eval] total tasks=${ledger.length} input=${input} output=${output} usd=${usd.toFixed(6)}`,
  )
  console.log(
    JSON.stringify(
      {
        model: "gpt-6-luna",
        usd,
        calls: ledger,
        efforts: (Object.keys(AI_TASKS) as AiTaskId[]).map((id) => {
          const task: AiTask = AI_TASKS[id]
          return {
            id,
            effort: task.reasoning ?? null,
            provider: task.provider,
          }
        }),
      },
      null,
      2,
    ),
  )
})

function looksFrench(text: string) {
  return (
    /[àâäéèêëïîôùûüçœ]/i.test(text) ||
    /\b(le|la|les|des|une|est|dans|pour|avec|recherche|résumé|semaine|lundi)\b/i.test(text)
  )
}

const HEADERS = [
  "Symbol",
  "Qty",
  "Entry",
  "Exit",
  "Entry time",
  "Exit time",
  "Profit",
  "Side",
  "Commission",
  "Duration",
  "Account",
]
const ROW = [
  "ES",
  "2.5",
  "5000.25",
  "4995.50",
  "2026-01-02 15:04:05",
  "2026-01-02 15:05:35",
  "-12.34",
  "short",
  "1.25",
  "90",
  "ACC-9",
]

function sameInstant(value: string, iso: string) {
  expect(Number.isNaN(new Date(value).getTime())).toBe(false)
  expect(new Date(value).toISOString()).toBe(iso)
}

describe.skipIf(!live)("live gpt-6-luna eval", () => {
  it("trade import matches pnl, quantity, side, symbol, and timestamps", async () => {
    const trades = await aiNormalizeTrades({
      headers: HEADERS,
      objects: [Object.fromEntries(HEADERS.map((header, index) => [header, ROW[index] ?? ""]))],
      accountNumber: "ACC-9",
    })
    expect(trades).toHaveLength(1)
    const trade = trades[0]
    expect(trade?.pnl).toBe(-12.34)
    expect(trade?.quantity).toBe(2.5)
    expect(trade?.side).toBe("short")
    expect(trade?.instrument).toBe("ES")
    expect(trade?.commission).toBe(1.25)
    expect(trade?.timeInPosition).toBe(90)
    expect(trade?.entryPrice).toBe("5000.25")
    expect(trade?.closePrice).toBe("4995.50")
    expect(trade?.accountNumber).toBe("ACC-9")
    sameInstant(String(trade?.entryDate), "2026-01-02T15:04:05.000Z")
    sameInstant(String(trade?.closeDate), "2026-01-02T15:05:35.000Z")
  })

  it("mappings names the known columns", async () => {
    const { POST } = await import("@/app/api/ai/mappings/route")
    const response = await POST(
      new NextRequest("http://localhost/api/ai/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldColumns: HEADERS,
          firstRows: [Object.fromEntries(HEADERS.map((header, index) => [header, ROW[index] ?? ""]))],
        }),
      }),
    )
    expect(response.status).toBe(200)
    const mapping = JSON.parse(await response.text()) as Record<string, string | null>
    expect(mapping.instrument).toBe("Symbol")
    expect(mapping.quantity).toBe("Qty")
    expect(mapping.entryPrice).toBe("Entry")
    expect(mapping.closePrice).toBe("Exit")
    expect(mapping.pnl).toBe("Profit")
    expect(mapping.side).toBe("Side")
    expect(mapping.commission).toBe("Commission")
    expect(mapping.entryDate).toBe("Entry time")
    expect(mapping.closeDate).toBe("Exit time")
  })

  it("import parse plan marks a closed trade and the same columns", async () => {
    const { POST } = await import("@/app/api/ai/import-parse-plan/route")
    const response = await POST(
      new NextRequest("http://localhost/api/ai/import-parse-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers: HEADERS, rows: [ROW] }),
      }),
    )
    expect(response.status).toBe(200)
    const plan = (await response.json()) as {
      kind: string
      columns: Record<string, string | null>
    }
    expect(plan.kind).toBe("closed-trades")
    expect(plan.columns.instrument).toBe("Symbol")
    expect(plan.columns.quantity).toBe("Qty")
    expect(plan.columns.pnl).toBe("Profit")
    expect(plan.columns.side).toBe("Side")
    expect(plan.columns.entryDate).toBe("Entry time")
    expect(plan.columns.closeDate).toBe("Exit time")
  })

  it("date search returns an absolute day and a weekday set", async () => {
    const { POST } = await import("@/app/api/ai/search/date/route")
    const day = await POST(
      new NextRequest("http://localhost/api/ai/search/date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "only 2026-03-04",
          locale: "en",
          timezone: "UTC",
        }),
      }),
    )
    expect(day.status).toBe(200)
    const range = (await day.json()) as { from: string | null; to: string | null }
    expect(range.from).toBe("2026-03-04")
    expect(range.to).toBe("2026-03-04")

    const days = await POST(
      new NextRequest("http://localhost/api/ai/search/date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "mondays and fridays",
          locale: "en",
          timezone: "UTC",
        }),
      }),
    )
    expect(days.status).toBe(200)
    const weekdays = (await days.json()) as { weekdays: number[] | null }
    expect(weekdays.weekdays?.slice().sort()).toEqual([1, 5])
  })

  it("chat tool chain calls getDayData and answers with its numbers", async () => {
    const result = await generateText({
      ...resolveAiTask("chat"),
      temperature: 0,
      stopWhen: isStepCount(3),
      prompt:
        "What were the pnl, quantity, and symbol on 2026-01-02? Call getDayData before answering. Reply with those three values and nothing else.",
      tools: {
        getDayData: tool({
          description: "Synthetic day result. The only source of numbers.",
          inputSchema: z.object({ date: z.string() }),
          execute: async () => ({ pnl: -12.34, quantity: 2.5, symbol: "ES" }),
        }),
      },
    })
    const names = result.steps.flatMap((step) => step.toolCalls.map((call) => call.toolName))
    expect(names).toContain("getDayData")
    expect(result.text).toContain("-12.34")
    expect(result.text).toContain("2.5")
    expect(result.text).toContain("ES")
  })

  it("support agent greps the repo and names gpt-6-luna", async () => {
    const { supportAgent } = await import("@/lib/ai/support-agent")
    const result = await supportAgent.generate({
      prompt:
        "What exact string is assigned to CHEAPEST_OPENAI_MODEL_ID in lib/ai/openai-generation.ts? Use grepCodebase, then readCodebaseFile if needed. Reply with only the model id.",
      options: { locale: "en" },
    })
    const calls = result.steps.flatMap((step) => step.toolCalls)
    expect(calls.some((call) => call.toolName === "grepCodebase")).toBe(true)
    expect(JSON.stringify(calls)).toContain("CHEAPEST_OPENAI_MODEL_ID")
    expect(result.text).toContain("gpt-6-luna")
    expect(result.text.toLowerCase()).not.toContain("gpt-4o")
    const reasoningText = [
      result.reasoningText ?? "",
      ...result.steps.map((step) => step.reasoningText ?? ""),
    ]
      .join("")
      .trim()
    expect(reasoningText.length).toBeGreaterThan(0)
  })

  it("editor improve returns a short actionable list", async () => {
    const { POST } = await import("@/app/api/ai/editor/route")
    const response = await POST(
      new NextRequest("http://localhost/api/ai/editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "improve",
          locale: "en",
          prompt: "I revenge traded after a loss and doubled size.",
        }),
      }),
    )
    expect(response.status).toBe(200)
    const text = uiMessageText(await response.text())
    expect(text.length).toBeGreaterThan(40)
    expect(text.toLowerCase()).toMatch(/revenge/)
    expect(text.toLowerCase()).toMatch(/size|position/)
    expect(text).toMatch(/[-•*]|\d\./)
  })

  it("account analysis returns the four sections for a synthetic loss", async () => {
    const { generateAnalysisComponent } = await import(
      "@/app/api/ai/analysis/accounts/generate-analysis-component"
    )
    const account = {
      accountNumber: "SYNTH",
      totalTrades: 1,
      winningTrades: 0,
      losingTrades: 1,
      winRate: 0,
      totalPnL: -12.34,
      totalCommission: 1.25,
      netPnL: -13.59,
      averageWin: 0,
      averageLoss: -12.34,
      profitFactor: 0,
      largestWin: 0,
      largestLoss: -12.34,
      averageTradeSize: 2.5,
      totalVolume: 2.5,
      maxDrawdown: 12.34,
      sharpeRatio: 0,
      instruments: ["ES"],
      mostTradedInstrument: "ES",
      accountUtilization: 0.1,
      riskLevel: "low" as const,
      consistency: 0,
      avgDailyVolume: 2.5,
      profitability: "unprofitable" as const,
    }
    const output = await generateAnalysisComponent.execute?.(
      {
        locale: "en",
        username: "synth",
        accountData: { accounts: [account], totalPortfolioValue: -13.59 },
      },
      {
        toolCallId: "call_synth",
        messages: [],
        abortSignal: AbortSignal.timeout(120_000),
        context: undefined as never,
      },
    )
    expect(output).toBeTruthy()
    const analysis = output as {
      structuredAnalysis?: {
        summary?: string
        strengths?: string[]
        improvements?: string[]
        recommendations?: string[]
      }
    }
    const structured = analysis.structuredAnalysis
    expect(structured?.summary?.length).toBeGreaterThan(20)
    expect(structured?.strengths?.length).toBeGreaterThan(0)
    expect(structured?.improvements?.length).toBeGreaterThan(0)
    expect(structured?.recommendations?.length).toBeGreaterThan(0)
    expect(`${structured?.summary} ${structured?.improvements?.join(" ")}`).toMatch(
      /-12\.34|loss|losing|negative|unprofitable/i,
    )
  })

  it("FAQ answer in French stays inside the token cap and invents no price", async () => {
    const answered = await answerLandingFaqQuestion({
      question: "Quelle est la couleur exacte du bouton principal de l'interface ?",
      locale: "fr",
    })
    expect(answered.source).toBe("ai")
    expect(looksFrench(answered.answer)).toBe(true)
    expect(answered.answer.length).toBeLessThan(1200)
    expect(answered.answer).not.toMatch(/(?:€|\$)\s*\d/)
  })

  it("translates a reasoning label into French inside the token cap", async () => {
    const translated = await translateReasoningLabel({
      text: "Searching documentation",
      locale: "fr",
    })
    expect(translated).not.toBe("Searching documentation")
    expect(translated.toLowerCase()).not.toContain("searching")
    expect(looksFrench(translated)).toBe(true)
    expect(translated.length).toBeLessThan(80)
  })

  it("weekly recap does not invent a ramp from one session", async () => {
    const result = await generateTradingAnalysis(
      [{ date: new Date("2026-08-31T00:00:00.000Z"), pnl: 120 }],
      "en",
    )
    const text = `${result.resultAnalysisIntro} ${result.tipsForNextWeek}`
    expect(result.resultAnalysisIntro).toMatch(/\b120\b/)
    expect(result.resultAnalysisIntro).toMatch(
      /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|day)\b/i,
    )
    expect(result.tipsForNextWeek.trim().length).toBeGreaterThan(10)
    expect(text).not.toMatch(
      /every day|each day|throughout the week|ramped|day after day|steady ramp/i,
    )
  })
})

function uiMessageText(raw: string): string {
  const parts: string[] = []
  for (const line of raw.split("\n")) {
    const payload = line.startsWith("data:") ? line.slice(5).trim() : ""
    if (!payload || payload === "[DONE]") continue
    try {
      const json = JSON.parse(payload) as { type?: string; delta?: string; text?: string }
      if (json.type === "text-delta" && typeof json.delta === "string") {
        parts.push(json.delta)
      }
    } catch {
      // Stream framing that is not a text part.
    }
  }
  return parts.join("")
}
