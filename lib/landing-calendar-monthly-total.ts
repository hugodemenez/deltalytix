import { format, isSameMonth } from "date-fns"

type CalendarDayEntry = {
  pnl: number
}

export function sumLandingCalendarMonthPnl(
  calendarDays: Date[],
  calendarData: Record<string, CalendarDayEntry>,
  monthDate: Date,
): number {
  return calendarDays.reduce((total, day) => {
    if (!isSameMonth(day, monthDate)) return total
    const dayData = calendarData[format(day, "yyyy-MM-dd")]
    return total + (dayData?.pnl ?? 0)
  }, 0)
}
