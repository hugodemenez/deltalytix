import { describe, expect, it } from "vitest"
import { tradeMatchesDateKey } from "./trade-matches-date"

describe("tradeMatchesDateKey", () => {
  const dateKey = "2026-06-06"

  it("matches exact date keys", () => {
    expect(
      tradeMatchesDateKey({ entryDate: "2026-06-06", closeDate: null }, dateKey),
    ).toBe(true)
  })

  it("matches ISO timestamps that start with the date key", () => {
    expect(
      tradeMatchesDateKey(
        { entryDate: "2026-06-06T14:30:00.000Z", closeDate: null },
        dateKey,
      ),
    ).toBe(true)
  })

  it("matches when only the close date falls on the day", () => {
    expect(
      tradeMatchesDateKey(
        { entryDate: "2026-06-05T23:00:00.000Z", closeDate: "2026-06-06T01:00:00.000Z" },
        dateKey,
      ),
    ).toBe(true)
  })

  it("does not match other days", () => {
    expect(
      tradeMatchesDateKey({ entryDate: "2026-06-07", closeDate: null }, dateKey),
    ).toBe(false)
  })
})
