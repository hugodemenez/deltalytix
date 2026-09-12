import { beforeEach, describe, expect, it, vi } from "vitest"

const streamObject = vi.hoisted(() => vi.fn())

vi.mock("ai", () => ({
  streamObject,
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
    streamObject.mockReset()
  })

  it("calls GPT-5.6 Luna High with the week-shape prompt", async () => {
    streamObject.mockReturnValue({
      partialObjectStream: objectStream([
        {
          intro: "One session this week, +120€ on Monday.",
          tips: "Open the calendar and tag that session in the journal.",
        },
      ]),
    })

    const result = await generateTradingAnalysis(
      [{ date: new Date("2026-08-31T00:00:00.000Z"), pnl: 120 }],
      "en",
    )

    expect(result.resultAnalysisIntro).toBe(
      "One session this week, +120€ on Monday.",
    )
    expect(result.tipsForNextWeek).toContain("calendar")

    expect(streamObject).toHaveBeenCalledOnce()
    const call = streamObject.mock.calls[0]?.[0]
    expect(call.model).toBe("openai/gpt-5.6-luna")
    expect(call.providerOptions?.openai?.reasoningEffort).toBe("high")
    expect(call.prompt).toContain("Trading days this week: 1")
    expect(call.prompt).toContain("single-day")
    expect(call.prompt).not.toContain("gpt-4.1-nano")
  })

  it("skips the model on an empty series", async () => {
    const result = await generateTradingAnalysis([], "fr")
    expect(streamObject).not.toHaveBeenCalled()
    expect(result.resultAnalysisIntro).toContain("statistiques")
  })
})
