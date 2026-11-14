import { describe, expect, it } from "vitest"
import { fromZonedTime, toZonedTime } from "date-fns-tz"
import {
  calendarMonthEventWindow,
  dashboardFinancialEventWindow,
  financialEventWhere,
  journalDayEventWindow,
  JOURNAL_DAY_TIMEZONE_PAD_MS,
  mergeFinancialEvents,
  parseFinancialEventRange,
  windowCovers,
} from "./date-window"

const ZONES = [
  "UTC",
  "America/New_York",
  "Europe/Paris",
  "Pacific/Auckland",
  "Pacific/Kiritimati",
  "Etc/GMT+12",
] as const

const INSTANTS = [
  "2026-01-01T00:30:00.000Z",
  "2026-03-08T06:30:00.000Z",
  "2026-06-15T12:00:00.000Z",
  "2026-11-01T00:30:00.000Z",
  "2026-11-13T15:04:00.000Z",
  "2026-12-31T23:30:00.000Z",
]

describe("dashboardFinancialEventWindow", () => {
  it("spans the previous UTC month through the end of the next one", () => {
    const now = new Date("2026-11-13T15:04:00.000Z")
    const window = dashboardFinancialEventWindow(now)
    expect(window.from.toISOString()).toBe("2026-10-01T00:00:00.000Z")
    expect(window.to.toISOString()).toBe("2026-12-31T23:59:59.999Z")
    expect(window.from.getTime()).toBeLessThanOrEqual(now.getTime())
    expect(window.to.getTime()).toBeGreaterThanOrEqual(now.getTime())
  })

  it("covers the calendar month on screen in every supported offset", () => {
    for (const instant of INSTANTS) {
      const now = new Date(instant)
      const loaded = dashboardFinancialEventWindow(now)
      for (const timezone of ZONES) {
        const zoned = toZonedTime(now, timezone)
        const visible = calendarMonthEventWindow(zoned, timezone)
        expect(
          windowCovers([loaded], visible),
          `${instant} ${timezone}`,
        ).toBe(true)
      }
    }
  })
})

describe("calendarMonthEventWindow", () => {
  it("is inclusive of the zoned month the calendar filters to", () => {
    const timezone = "America/New_York"
    const zoned = toZonedTime(new Date("2026-11-13T15:00:00.000Z"), timezone)
    const window = calendarMonthEventWindow(zoned, timezone)
    expect(window.from).toEqual(fromZonedTime("2026-11-01T00:00:00.000", timezone))
    expect(window.to).toEqual(fromZonedTime("2026-11-30T23:59:59.999", timezone))
  })
})

describe("journalDayEventWindow", () => {
  it("contains the whole browser-local day and pads by 14 hours", () => {
    const date = new Date(2026, 10, 13, 15, 30, 0, 0)
    const window = journalDayEventWindow(date)
    const start = new Date(2026, 10, 13, 0, 0, 0, 0)
    const end = new Date(2026, 10, 13, 23, 59, 59, 999)
    expect(window.from.getTime()).toBe(start.getTime() - JOURNAL_DAY_TIMEZONE_PAD_MS)
    expect(window.to.getTime()).toBe(end.getTime() + JOURNAL_DAY_TIMEZONE_PAD_MS)
    expect(window.from.getTime()).toBeLessThanOrEqual(start.getTime())
    expect(window.to.getTime()).toBeGreaterThanOrEqual(end.getTime())
  })
})

describe("parseFinancialEventRange", () => {
  const now = new Date("2026-11-13T15:04:00.000Z")

  it("uses the dashboard window when the caller omits a range", () => {
    expect(parseFinancialEventRange(undefined, now)).toEqual(
      dashboardFinancialEventWindow(now),
    )
  })

  it("keeps an inclusive range", () => {
    const from = new Date("2026-11-01T00:00:00.000Z")
    const to = new Date("2026-11-30T23:59:59.999Z")
    expect(parseFinancialEventRange({ from, to }, now)).toEqual({ from, to })
    expect(
      parseFinancialEventRange(
        { from: from.toISOString(), to: to.toISOString() },
        now,
      ),
    ).toEqual({ from, to })
  })

  it("returns null for invalid or inverted bounds", () => {
    expect(
      parseFinancialEventRange({ from: "not-a-date", to: "2026-11-01T00:00:00.000Z" }, now),
    ).toBeNull()
    expect(
      parseFinancialEventRange(
        { from: "2026-12-01T00:00:00.000Z", to: "2026-11-01T00:00:00.000Z" },
        now,
      ),
    ).toBeNull()
  })
})

describe("financialEventWhere", () => {
  const window = dashboardFinancialEventWindow(new Date("2026-11-13T00:00:00.000Z"))

  it("filters lang and an inclusive date window", () => {
    expect(financialEventWhere("fr", window)).toEqual({
      lang: "fr",
      date: { gte: window.from, lte: window.to },
    })
  })

  it("omits lang when the caller did not pass one", () => {
    expect(financialEventWhere(undefined, window)).toEqual({
      date: { gte: window.from, lte: window.to },
    })
    expect(financialEventWhere("", window)).toEqual({
      date: { gte: window.from, lte: window.to },
    })
  })
})

describe("windowCovers", () => {
  const outer = {
    from: new Date("2026-10-01T00:00:00.000Z"),
    to: new Date("2026-12-31T23:59:59.999Z"),
  }

  it("accepts a range that sits inside a loaded window", () => {
    expect(
      windowCovers([outer], {
        from: new Date("2026-11-01T00:00:00.000Z"),
        to: new Date("2026-11-30T23:59:59.999Z"),
      }),
    ).toBe(true)
  })

  it("rejects a range that sticks out of every loaded window", () => {
    expect(
      windowCovers([outer], {
        from: new Date("2026-09-30T00:00:00.000Z"),
        to: new Date("2026-11-01T00:00:00.000Z"),
      }),
    ).toBe(false)
    expect(windowCovers([], outer)).toBe(false)
  })
})

describe("mergeFinancialEvents", () => {
  it("keeps order, replaces the same id, and appends new ids", () => {
    const merged = mergeFinancialEvents(
      [
        { id: "a", title: "old" },
        { id: "b", title: "keep" },
      ],
      [
        { id: "a", title: "new" },
        { id: "c", title: "added" },
      ],
    )
    expect(merged).toEqual([
      { id: "a", title: "new" },
      { id: "b", title: "keep" },
      { id: "c", title: "added" },
    ])
  })

  it("returns a copy when nothing arrives", () => {
    const existing = [{ id: "a" }]
    const merged = mergeFinancialEvents(existing, [])
    expect(merged).toEqual(existing)
    expect(merged).not.toBe(existing)
  })
})
