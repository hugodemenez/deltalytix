import { describe, expect, it } from "vitest"
import { format } from "date-fns"
import { sumLandingCalendarMonthPnl } from "./landing-calendar-monthly-total"

describe("sumLandingCalendarMonthPnl", () => {
  it("sums all calendar data for the month, not adjacent months", () => {
    const currentDate = new Date(2026, 5, 15)
    const calendarData = {
      "2026-05-31": { pnl: 999 },
      "2026-06-01": { pnl: 120 },
      "2026-06-15": { pnl: 540 },
      "2026-06-30": { pnl: 95 },
      "2026-07-01": { pnl: 888 },
    }

    expect(sumLandingCalendarMonthPnl(calendarData, currentDate)).toBe(755)
  })

  it("does not drop the first of the month in negative UTC offsets", () => {
    const previousTz = process.env.TZ
    process.env.TZ = "America/Los_Angeles"

    try {
      const currentDate = new Date(2026, 5, 15)
      const calendarData = {
        "2026-06-01": { pnl: 120 },
        "2026-06-02": { pnl: 620 },
      }

      expect(sumLandingCalendarMonthPnl(calendarData, currentDate)).toBe(740)
    } finally {
      process.env.TZ = previousTz
    }
  })

  it("includes month entries even when the grid would only show a subset", () => {
    const currentDate = new Date(2026, 5, 15)
    const calendarData = [1, 2, 29, 30].reduce<Record<string, { pnl: number }>>(
      (acc, day) => {
        const dateKey = format(new Date(2026, 5, day), "yyyy-MM-dd")
        acc[dateKey] = { pnl: day * 100 }
        return acc
      },
      {},
    )

    expect(sumLandingCalendarMonthPnl(calendarData, currentDate)).toBe(6200)
  })
})
