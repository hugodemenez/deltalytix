import { describe, expect, it } from "vitest"
import { toUserZonedTime } from "@/lib/calendar-timezone"
import {
  calendarMonthFinancialEventWindow,
  dashboardFinancialEventWindow,
  explicitFinancialEventWindow,
  financialEventRangeCovers,
  financialEventWhere,
  financialEventWindowDays,
  localDayFinancialEventWindow,
} from "./date-window"

const ZONES = [
  "UTC",
  "Pacific/Honolulu",
  "America/Los_Angeles",
  "Europe/Paris",
  "Asia/Tokyo",
  "Pacific/Kiritimati",
] as const

describe("dashboardFinancialEventWindow", () => {
  it.each([
    "2026-11-13T12:00:00.000Z",
    "2026-11-01T00:30:00.000Z",
    "2026-01-01T00:30:00.000Z",
  ])("covers the calendar month and local today in every timezone at %s", (iso) => {
    const now = new Date(iso)
    const window = dashboardFinancialEventWindow(now)

    expect(financialEventWindowDays(window)).toBeGreaterThan(0)
    expect(financialEventWindowDays(window)).toBeLessThan(64)

    for (const timezone of ZONES) {
      const month = calendarMonthFinancialEventWindow(
        toUserZonedTime(now, timezone),
        timezone,
      )
      expect(window.start.getTime()).toBeLessThanOrEqual(month.start.getTime())
      expect(window.end.getTime()).toBeGreaterThanOrEqual(month.end.getTime())
    }
  })
})

describe("calendarMonthFinancialEventWindow", () => {
  it("matches the calendar's zoned month interval", () => {
    const zoned = toUserZonedTime(new Date("2026-03-15T18:00:00.000Z"), "America/New_York")
    const window = calendarMonthFinancialEventWindow(zoned, "America/New_York")
    expect(window.start.toISOString()).toBe("2026-03-01T05:00:00.000Z")
    expect(window.end.toISOString()).toBe("2026-04-01T03:59:59.999Z")
  })
})

describe("localDayFinancialEventWindow", () => {
  it("is the local calendar day used by the journal toDateString filter", () => {
    const selected = new Date(2026, 2, 15, 15, 45, 30, 250)
    const window = localDayFinancialEventWindow(selected)

    expect(window.start.getFullYear()).toBe(2026)
    expect(window.start.getMonth()).toBe(2)
    expect(window.start.getDate()).toBe(15)
    expect(window.start.getHours()).toBe(0)
    expect(window.start.getMinutes()).toBe(0)
    expect(window.start.getSeconds()).toBe(0)
    expect(window.start.getMilliseconds()).toBe(0)
    expect(window.end.getHours()).toBe(23)
    expect(window.end.getMinutes()).toBe(59)
    expect(window.end.getSeconds()).toBe(59)
    expect(window.end.getMilliseconds()).toBe(999)

    const atStart = new Date(window.start)
    const atEnd = new Date(window.end)
    const before = new Date(window.start.getTime() - 1)
    const after = new Date(window.end.getTime() + 1)

    for (const inside of [atStart, selected, atEnd]) {
      expect(inside.toDateString()).toBe(selected.toDateString())
      expect(inside.getTime()).toBeGreaterThanOrEqual(window.start.getTime())
      expect(inside.getTime()).toBeLessThanOrEqual(window.end.getTime())
    }
    expect(before.toDateString()).not.toBe(selected.toDateString())
    expect(after.toDateString()).not.toBe(selected.toDateString())
  })
})

describe("explicitFinancialEventWindow", () => {
  it("keeps an inclusive range and rejects inverted or invalid input", () => {
    const start = new Date("2026-04-01T00:00:00.000Z")
    const end = new Date("2026-04-02T00:00:00.000Z")
    expect(explicitFinancialEventWindow(start, end)).toEqual({ start, end })
    expect(
      explicitFinancialEventWindow("2026-04-01T00:00:00.000Z", "2026-04-02T00:00:00.000Z")?.start.toISOString(),
    ).toBe("2026-04-01T00:00:00.000Z")
    expect(explicitFinancialEventWindow(end, start)).toBeNull()
    expect(explicitFinancialEventWindow("not-a-date", end)).toBeNull()
  })
})

describe("financialEventWhere", () => {
  it("always applies the date window with the language", () => {
    const window = {
      start: new Date("2026-11-01T00:00:00.000Z"),
      end: new Date("2026-11-30T23:59:59.999Z"),
    }
    expect(financialEventWhere("fr", window)).toEqual({
      lang: "fr",
      date: { gte: window.start, lte: window.end },
    })
  })

  it("still bounds the date when no language is provided", () => {
    const window = {
      start: new Date("2026-11-01T00:00:00.000Z"),
      end: new Date("2026-11-30T23:59:59.999Z"),
    }
    expect(financialEventWhere(undefined, window)).toEqual({
      date: { gte: window.start, lte: window.end },
    })
  })
})

describe("financialEventRangeCovers", () => {
  const november = {
    startMs: Date.parse("2026-11-01T00:00:00.000Z"),
    endMs: Date.parse("2026-11-30T23:59:59.999Z"),
    lang: "en",
  }

  it("covers a day inside the same language and rejects other languages", () => {
    const day = {
      startMs: Date.parse("2026-11-13T00:00:00.000Z"),
      endMs: Date.parse("2026-11-13T23:59:59.999Z"),
      lang: "en",
    }
    expect(financialEventRangeCovers([november], day)).toBe(true)
    expect(financialEventRangeCovers([november], { ...day, lang: "fr" })).toBe(false)
    expect(
      financialEventRangeCovers([november], {
        ...day,
        startMs: Date.parse("2026-12-01T00:00:00.000Z"),
        endMs: Date.parse("2026-12-01T23:59:59.999Z"),
      }),
    ).toBe(false)
    expect(financialEventRangeCovers([], day)).toBe(false)
  })
})
