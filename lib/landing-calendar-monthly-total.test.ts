import { describe, expect, it } from "vitest"
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { sumLandingCalendarMonthPnl } from "./landing-calendar-monthly-total"

function getCalendarDays(monthStart: Date, monthEnd: Date) {
  return eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
  })
}

describe("sumLandingCalendarMonthPnl", () => {
  it("sums demo days for the visible month using local date keys", () => {
    const currentDate = new Date(2026, 5, 15)
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarDays = getCalendarDays(monthStart, monthEnd)

    const calendarData = [1, 2, 3, 4].reduce<Record<string, { pnl: number }>>(
      (acc, day) => {
        const dateKey = format(new Date(2026, 5, day), "yyyy-MM-dd")
        acc[dateKey] = { pnl: day * 100 }
        return acc
      },
      {},
    )

    const expected = Object.values(calendarData).reduce(
      (total, entry) => total + entry.pnl,
      0,
    )

    expect(sumLandingCalendarMonthPnl(calendarDays, calendarData, currentDate)).toBe(
      expected,
    )
  })

  it("does not drop the first of the month in negative UTC offsets", () => {
    const previousTz = process.env.TZ
    process.env.TZ = "America/Los_Angeles"

    try {
      const currentDate = new Date(2026, 5, 15)
      const calendarDays = getCalendarDays(
        startOfMonth(currentDate),
        endOfMonth(currentDate),
      )
      const calendarData = {
        "2026-06-01": { pnl: 120 },
        "2026-06-02": { pnl: 620 },
      }

      expect(
        sumLandingCalendarMonthPnl(calendarDays, calendarData, currentDate),
      ).toBe(740)
    } finally {
      process.env.TZ = previousTz
    }
  })
})
