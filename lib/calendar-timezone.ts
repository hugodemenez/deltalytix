import {
  addDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { fromZonedTime, toZonedTime } from "date-fns-tz"

/** Wall-clock date in the user's timezone as a Date for date-fns local getters. */
export function toUserZonedTime(date: Date, timezone: string): Date {
  return toZonedTime(date, timezone)
}

/** yyyy-MM-dd for a calendar cell or trade bucket in the user's timezone. */
export function calendarDateKey(date: Date, timezone: string): string {
  return format(toUserZonedTime(date, timezone), "yyyy-MM-dd")
}

/** yyyy-MM-dd when `date` is already from {@link toUserZonedTime}. */
export function calendarDateKeyFromZoned(zonedDate: Date): string {
  return format(zonedDate, "yyyy-MM-dd")
}

export function isTodayInTimezone(date: Date, timezone: string): boolean {
  return isSameDay(date, toUserZonedTime(new Date(), timezone))
}

export function getCalendarGridDays(
  zonedMonthDate: Date,
  weekStartsOnMonday: boolean,
): Date[] {
  const weekStartsOn = weekStartsOnMonday ? 1 : 0
  const monthStart = startOfMonth(zonedMonthDate)
  const monthEnd = endOfMonth(zonedMonthDate)
  const startDate = startOfWeek(monthStart, { weekStartsOn })
  const endDate = endOfWeek(monthEnd, { weekStartsOn })
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  if (days.length === 42) return days

  const lastDay = days[days.length - 1]
  const additionalDays = eachDayOfInterval({
    start: addDays(lastDay, 1),
    end: addDays(startDate, 41),
  })

  return [...days, ...additionalDays].slice(0, 42)
}

export function zonedMonthInterval(
  zonedMonthDate: Date,
  timezone: string,
): { startUtc: Date; endUtc: Date } {
  const monthStart = startOfMonth(zonedMonthDate)
  const monthEnd = endOfMonth(zonedMonthDate)
  return {
    startUtc: fromZonedTime(monthStart, timezone),
    endUtc: fromZonedTime(endOfDay(monthEnd), timezone),
  }
}

export function zonedYearInterval(
  year: number,
  timezone: string,
): { startZoned: Date; endZoned: Date } {
  return {
    startZoned: toUserZonedTime(
      fromZonedTime(`${year}-01-01T00:00:00`, timezone),
      timezone,
    ),
    endZoned: toUserZonedTime(
      fromZonedTime(`${year}-12-31T23:59:59`, timezone),
      timezone,
    ),
  }
}
