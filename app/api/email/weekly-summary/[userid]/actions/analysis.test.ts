import { beforeEach, describe, expect, it, vi } from "vitest"

const streamText = vi.hoisted(() => vi.fn())

vi.mock("ai", () => ({
  streamText,
  Output: { object: (options: unknown) => options },
}))

import { generateTradingAnalysis } from "./analysis"

async function* objectStream(
  parts: Array<{ intro?: string; tips?: string }>,
) {
  for (const part of parts) {
    yield part
  }
}

describe("generateTradingAnalysis", () => {
  beforeEach(() => {
    streamText.mockReset()
  })

  it("calls gpt-6-luna at effort none with the week-shape prompt", async () => {
    streamText.mockReturnValue({
      partialOutputStream: objectStream([
        {
          intro: "One session this week, +$120 on Monday.",
          tips: "Open the calendar and tag that session in the journal.",
        },
      ]),
    })

    const result = await generateTradingAnalysis(
      [{ date: new Date("2026-08-31T00:00:00.000Z"), pnl: 120 }],
      "en",
    )

    expect(result.resultAnalysisIntro).toBe(
      "One session this week, +$120 on Monday.",
    )
    expect(result.tipsForNextWeek).toContain("calendar")

    expect(streamText).toHaveBeenCalledOnce()
    const call = streamText.mock.calls[0]?.[0]
    expect(call.model.modelId).toBe("gpt-6-luna")
    expect(call.reasoning).toBe("none")
    expect(call.prompt).toContain("Trading days this week: 1")
    expect(call.prompt).toContain("single-day")
    expect(call.prompt).toContain("$120")
    expect(call.prompt).toContain("US dollars")
    expect(call.prompt).not.toContain("€")
    expect(call.prompt).not.toContain("gpt-4.1-nano")
  })

  it("skips the model on an empty series", async () => {
    const result = await generateTradingAnalysis([], "fr")
    expect(streamText).not.toHaveBeenCalled()
    expect(result.resultAnalysisIntro).toContain("statistiques")
  })
})
