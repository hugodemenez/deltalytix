import { describe, expect, it } from "vitest"
import { formatInTimeZone } from "date-fns-tz"
import { fromZonedTime } from "date-fns-tz"

import { formatCalendarData } from "./utils"
import {
  calendarDateKeyFromZoned,
  getCalendarGridDays,
  toUserZonedTime,
} from "./calendar-timezone"
import type { Trade } from "@/prisma/generated/prisma/browser"

function makeTrade(entryDate: string): Trade {
  return {
    entryDate,
    closeDate: entryDate,
    pnl: 100,
    commission: 0,
    side: "long",
    accountNumber: "A1",
    instrument: "MNQ",
    quantity: 1,
  } as Trade
}

describe("calendar grid timezone alignment", () => {
  it("maps Monday afternoon NY trades to the Monday grid cell", () => {
    const timezone = "America/New_York"
    const trade = makeTrade("2026-07-06T19:00:00.000Z") // Mon 3pm ET
    const calendarData = formatCalendarData([trade], [], timezone)

    const zonedRef = toUserZonedTime(new Date("2026-07-15T12:00:00.000Z"), timezone)
    const days = getCalendarGridDays(zonedRef, true)
    const mondayCell = days.find(
      (day) => calendarDateKeyFromZoned(day) === "2026-07-06",
    )

    expect(mondayCell).toBeDefined()
    expect(calendarData[calendarDateKeyFromZoned(mondayCell!)]?.tradeNumber).toBe(1)
  })

  it("does not shift grid keys when user TZ differs from a Paris-local midnight", () => {
    const timezone = "America/New_York"
    const trade = makeTrade("2026-07-06T19:00:00.000Z")
    const calendarData = formatCalendarData([trade], [], timezone)

    // Paris-local midnight on July 6 (old grid used browser-local midnights).
    const parisLocalMidnight = fromZonedTime("2026-07-06T00:00:00", "Europe/Paris")
    const buggyKey = formatInTimeZone(parisLocalMidnight, timezone, "yyyy-MM-dd")

    const zonedRef = toUserZonedTime(new Date("2026-07-15T12:00:00.000Z"), timezone)
    const mondayCell = getCalendarGridDays(zonedRef, true).find(
      (day) => calendarDateKeyFromZoned(day) === "2026-07-06",
    )

    expect(buggyKey).toBe("2026-07-05")
    expect(calendarData[buggyKey]).toBeUndefined()
    expect(calendarData[calendarDateKeyFromZoned(mondayCell!)]?.tradeNumber).toBe(1)
  })
})
