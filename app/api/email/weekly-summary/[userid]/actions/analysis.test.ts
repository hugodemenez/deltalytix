import { beforeEach, describe, expect, it, vi } from "vitest"

const generateText = vi.hoisted(() => vi.fn())

vi.mock("ai", () => ({
  generateText,
  Output: { object: (options: unknown) => options },
}))

import { generateTradingAnalysis } from "./analysis"

describe("generateTradingAnalysis", () => {
  beforeEach(() => {
    generateText.mockReset()
    delete process.env.WEEKLY_ANALYSIS_MODEL
  })

  it("calls gpt-6-luna at effort high with the week-shape prompt", async () => {
    generateText.mockResolvedValue({
      output: {
        intro: "One session this week, +$120 on Monday.",
        tips: "Open the calendar and tag that session in the journal.",
      },
    })

    const result = await generateTradingAnalysis(
      [{ date: new Date("2026-08-31T00:00:00.000Z"), pnl: 120 }],
      "en",
    )

    expect(result.resultAnalysisIntro).toBe(
      "One session this week, +$120 on Monday.",
    )
    expect(result.tipsForNextWeek).toContain("calendar")

    expect(generateText).toHaveBeenCalledOnce()
    const call = generateText.mock.calls[0]?.[0]
    expect(call.model.modelId).toBe("gpt-6-luna")
    expect(call.reasoning).toBe("high")
    expect(call.temperature).toBeUndefined()
    expect(call.maxOutputTokens).toBe(4000)
    expect(call.providerOptions).toEqual({
      openai: { reasoningSummary: null },
    })
    expect(call.prompt).toContain("Trading days this week: 1")
    expect(call.prompt).toContain("single-day")
    expect(call.prompt).toContain("$120")
    expect(call.prompt).toContain("US dollars")
    expect(call.prompt).not.toContain("€")
    expect(call.prompt).not.toContain("gpt-4.1-nano")
  })

  it("logs finish reason and usage when the model returns no intro", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    generateText.mockResolvedValue({
      output: { intro: "", tips: "" },
      finishReason: "length",
      usage: { inputTokens: 12, outputTokens: 4000 },
    })

    const result = await generateTradingAnalysis(
      [{ date: new Date("2026-08-31T00:00:00.000Z"), pnl: 120 }],
      "en",
    )

    expect(result.resultAnalysisIntro).toContain("statistics")
    expect(error).toHaveBeenCalledWith(
      "Weekly recap fell back to the default blurb",
      {
        finishReason: "length",
        usage: { inputTokens: 12, outputTokens: 4000 },
      },
    )
    error.mockRestore()
  })

  it("skips the model on an empty series", async () => {
    const result = await generateTradingAnalysis([], "fr")
    expect(generateText).not.toHaveBeenCalled()
    expect(result.resultAnalysisIntro).toContain("statistiques")
  })
})
