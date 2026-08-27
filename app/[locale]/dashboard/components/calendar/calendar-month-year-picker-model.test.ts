import { describe, expect, it } from "vitest"
import {
  CALENDAR_MONTH_KEYS,
  CALENDAR_PICKER_START_YEAR,
  dateFromMonthYear,
  getCalendarPickerEndYear,
  getCalendarPickerYears,
} from "./calendar-month-year-picker-model"

describe("getCalendarPickerYears", () => {
  it("spans 2000 through current year plus two", () => {
    const now = new Date(2026, 7, 1)
    const years = getCalendarPickerYears(now)

    expect(years[0]).toBe(CALENDAR_PICKER_START_YEAR)
    expect(years[0]).toBe(2000)
    expect(years.at(-1)).toBe(2028)
    expect(getCalendarPickerEndYear(now)).toBe(2028)
    expect(years).toHaveLength(2028 - 2000 + 1)
  })

  it("includes a year outside the default range so the select stays valid", () => {
    const years = getCalendarPickerYears(new Date(2026, 0, 1), 1998)

    expect(years[0]).toBe(1998)
    expect(years).toContain(2000)
    expect(years.at(-1)).toBe(2028)
  })
})

describe("dateFromMonthYear", () => {
  it("jumps to the first day of the selected month", () => {
    const date = dateFromMonthYear(2024, 1)

    expect(date.getFullYear()).toBe(2024)
    expect(date.getMonth()).toBe(1)
    expect(date.getDate()).toBe(1)
  })
})

describe("CALENDAR_MONTH_KEYS", () => {
  it("lists all twelve months in calendar order", () => {
    expect(CALENDAR_MONTH_KEYS).toHaveLength(12)
    expect(CALENDAR_MONTH_KEYS[0]).toBe("calendar.months.january")
    expect(CALENDAR_MONTH_KEYS[7]).toBe("calendar.months.august")
  })
})
