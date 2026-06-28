import { format } from "date-fns"

type CalendarDayEntry = {
  pnl: number
}

/** Sum all P/L in calendarData for the given month (local yyyy-MM), independent of grid layout. */
export function sumLandingCalendarMonthPnl(
  calendarData: Record<string, CalendarDayEntry>,
  monthDate: Date,
): number {
  const monthKey = format(monthDate, "yyyy-MM")

  return Object.entries(calendarData).reduce((total, [dateKey, dayData]) => {
    return dateKey.startsWith(monthKey) ? total + dayData.pnl : total
  }, 0)
}
