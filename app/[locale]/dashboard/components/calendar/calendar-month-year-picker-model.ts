/** Matches the filter / share date pickers: 2000 through current year + 2. */
export const CALENDAR_PICKER_START_YEAR = 2000

export function getCalendarPickerEndYear(now: Date = new Date()): number {
  return now.getFullYear() + 2
}

export function getCalendarPickerYears(
  now: Date = new Date(),
  includeYear?: number,
): number[] {
  const start = CALENDAR_PICKER_START_YEAR
  const end = getCalendarPickerEndYear(now)
  const years: number[] = []
  for (let year = start; year <= end; year += 1) {
    years.push(year)
  }
  if (
    includeYear != null &&
    Number.isFinite(includeYear) &&
    (includeYear < start || includeYear > end)
  ) {
    years.push(includeYear)
    years.sort((a, b) => a - b)
  }
  return years
}

export function dateFromMonthYear(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex, 1)
}

export const CALENDAR_MONTH_KEYS = [
  "calendar.months.january",
  "calendar.months.february",
  "calendar.months.march",
  "calendar.months.april",
  "calendar.months.may",
  "calendar.months.june",
  "calendar.months.july",
  "calendar.months.august",
  "calendar.months.september",
  "calendar.months.october",
  "calendar.months.november",
  "calendar.months.december",
] as const
