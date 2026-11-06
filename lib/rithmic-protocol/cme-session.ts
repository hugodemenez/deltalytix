import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

/**
 * CME Globex weekly maintenance close (Friday 17:00 America/Chicago) and
 * Sunday 17:00 reopen. Distinct from `lib/rithmic-weekend.ts`, which is
 * local Sat/Sun Rithmic *server* downtime for the UI.
 */
export const CME_GLOBEX_TIMEZONE = 'America/Chicago'
export const CME_WEEKLY_CLOSE_HOUR = 17

function utcYmd(year: number, monthIndex: number, day: number): string {
  const date = new Date(Date.UTC(year, monthIndex, day))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function addCalendarDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number)
  return utcYmd(year, month - 1, day + days)
}

function chicagoYmd(instant: Date): string {
  return formatInTimeZone(instant, CME_GLOBEX_TIMEZONE, 'yyyy-MM-dd')
}

function chicagoHour(instant: Date): number {
  return Number(formatInTimeZone(instant, CME_GLOBEX_TIMEZONE, 'H'))
}

function calendarDayOfWeek(ymd: string): number {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

function fridayCloseInstant(ymd: string): Date {
  return fromZonedTime(`${ymd}T${String(CME_WEEKLY_CLOSE_HOUR).padStart(2, '0')}:00:00`, CME_GLOBEX_TIMEZONE)
}

/** First UTC calendar day strictly after `instant`. */
export function utcCalendarDayAfter(instant: Date): Date {
  return new Date(
    Date.UTC(
      instant.getUTCFullYear(),
      instant.getUTCMonth(),
      instant.getUTCDate() + 1,
    ),
  )
}

function compactYmd(value: string): string | null {
  const compact = value.replace(/-/g, '')
  return /^\d{8}$/.test(compact) ? compact : null
}

/**
 * Globex session open for an exchange trade date: 17:00 America/Chicago on
 * the previous calendar day (Sunday 17:00 CT for a Monday trade date).
 *
 * `fill_date` without `ssboe` is this session date, not UTC midnight. Evening
 * fills on the first window after weekly close belong at this open, which is
 * after Friday 17:00 CT — UTC midnight of the trade date is the wrong side of
 * that first cutoff.
 */
export function globexSessionOpenForTradeDate(fillDateYmd: string): Date | null {
  const compact = compactYmd(fillDateYmd)
  if (!compact) return null
  const year = Number(compact.slice(0, 4))
  const month = Number(compact.slice(4, 6))
  const day = Number(compact.slice(6, 8))
  const previous = new Date(Date.UTC(year, month - 1, day) - 24 * 60 * 60 * 1000)
  const previousYmd = utcYmd(
    previous.getUTCFullYear(),
    previous.getUTCMonth(),
    previous.getUTCDate(),
  )
  return fromZonedTime(
    `${previousYmd}T${String(CME_WEEKLY_CLOSE_HOUR).padStart(2, '0')}:00:00`,
    CME_GLOBEX_TIMEZONE,
  )
}

/**
 * Most recent CME Globex weekly close (Friday 17:00 America/Chicago,
 * DST-aware) at or before `instant`. Friday 17:00:00 exactly counts as
 * this week's close.
 */
export function cmeWeeklyCloseAtOrBefore(instant: Date): Date {
  const ymd = chicagoYmd(instant)
  const hour = chicagoHour(instant)
  const dow = calendarDayOfWeek(ymd)
  const daysBack =
    dow === 5 ? (hour >= CME_WEEKLY_CLOSE_HOUR ? 0 : 7) : (dow + 7 - 5) % 7
  return fridayCloseInstant(addCalendarDays(ymd, -daysBack))
}

export type AnchoredFillHistoryRange = {
  requestedStart: Date
  weeklyClose: Date
  startUtc: Date
}

/**
 * Extend a requested ShowFillHistory start back to the UTC calendar day
 * after the most recent CME weekly close. The book is usually flat there;
 * a broker snapshot still has to confirm P_0 when the plant cannot reach
 * that far or the trader held over the weekend.
 */
export function planFillHistoryRange(requestedStart: Date): AnchoredFillHistoryRange {
  const weeklyClose = cmeWeeklyCloseAtOrBefore(requestedStart)
  return {
    requestedStart,
    weeklyClose,
    startUtc: utcCalendarDayAfter(weeklyClose),
  }
}
