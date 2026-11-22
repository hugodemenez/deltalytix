import { beforeEach, describe, expect, it, vi } from "vitest"

const loadFinancialEvents = vi.fn()

vi.mock("@/lib/financial-events/load", () => ({
  loadFinancialEvents: (...args: unknown[]) => loadFinancialEvents(...args),
}))

import { FINANCIAL_EVENT_MAX_WINDOW_MS } from "@/lib/financial-events/date-window"
import { getFinancialNews } from "./get-financial-news"

async function execute(startDate: string, endDate: string) {
  return getFinancialNews.execute!(
    { locale: "en", startDate, endDate },
    { toolCallId: "t", messages: [], context: undefined } as never,
  )
}

describe("getFinancialNews", () => {
  beforeEach(() => {
    loadFinancialEvents.mockReset()
  })

  it("returns the events when the range is inside the cap", async () => {
    const event = { date: new Date("2026-03-13T13:30:00.000Z"), title: "CPI" }
    loadFinancialEvents.mockResolvedValue([event])

    const result = await execute("2026-03-01T00:00:00.000Z", "2026-03-31T00:00:00.000Z")

    expect(result).toEqual([event])
  })

  it("tells the model when the range was wider than 62 days", async () => {
    const end = new Date("2026-06-01T00:00:00.000Z")
    const kept = { date: new Date(end.getTime() - 60_000), title: "NFP" }
    const dropped = { date: new Date("2020-02-01T00:00:00.000Z"), title: "old" }
    loadFinancialEvents.mockResolvedValue([kept, dropped])

    const result = await execute("2020-01-01T00:00:00.000Z", end.toISOString())

    expect(Array.isArray(result)).toBe(false)
    expect(result).toMatchObject({
      appliedEnd: end.toISOString(),
      events: [kept],
    })
    expect((result as { notice: string }).notice).toMatch(/62 days/)
    expect(Date.parse((result as { appliedStart: string }).appliedStart)).toBe(
      end.getTime() - FINANCIAL_EVENT_MAX_WINDOW_MS,
    )
    const queried = loadFinancialEvents.mock.calls[0]?.[1] as { start: Date; end: Date }
    expect(queried.end.toISOString()).toBe(end.toISOString())
    expect(queried.end.getTime() - queried.start.getTime()).toBe(FINANCIAL_EVENT_MAX_WINDOW_MS)
  })
})
