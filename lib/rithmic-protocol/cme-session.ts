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
  return fromZonedTime(
    `${ymd}T${String(CME_WEEKLY_CLOSE_HOUR).padStart(2, '0')}:00:00`,
    CME_GLOBEX_TIMEZONE,
  )
}

export function utcCalendarDay(instant: Date): Date {
  return new Date(
    Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate()),
  )
}

/** First UTC calendar day strictly after `instant`. */
export function utcCalendarDayAfter(instant: Date): Date {
  const day = utcCalendarDay(instant)
  day.setUTCDate(day.getUTCDate() + 1)
  return day
}

export function toUtcYyyymmdd(instant: Date): string {
  const day = utcCalendarDay(instant)
  return `${day.getUTCFullYear()}${String(day.getUTCMonth() + 1).padStart(2, '0')}${String(day.getUTCDate()).padStart(2, '0')}`
}

export function toUtcYyyyMmDd(instant: Date): string {
  const day = utcCalendarDay(instant)
  return `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, '0')}-${String(day.getUTCDate()).padStart(2, '0')}`
}

export function parseUtcYyyyMmDd(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return date
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

/**
 * End of the given Chicago calendar day, used so an admin-supplied
 * `YYYY-MM-DD` of a Friday resolves to that Friday's 17:00 CT close.
 */
export function endOfChicagoDay(ymd: string): Date | null {
  const parsed = parseUtcYyyyMmDd(ymd)
  if (!parsed) return null
  return fromZonedTime(`${ymd}T23:59:59.999`, CME_GLOBEX_TIMEZONE)
}

/**
 * Admin weekend-anchor picker.
 *
 * `requestedAnchor` may be `YYYY-MM-DD` (Chicago calendar day) or an ISO
 * timestamp. Default: the most recent Friday 17:00 CT close at or before
 * `earliestNeededMs`.
 */
export function resolveAdminWeekendAnchor(params: {
  requestedAnchor?: string
  earliestNeededMs: number
}): { weeklyClose: Date; historyStartYmd: string } {
  const requested = params.requestedAnchor?.trim()
  let instant: Date
  if (requested) {
    const asDay = parseUtcYyyyMmDd(requested)
    if (asDay) {
      const end = endOfChicagoDay(requested)
      if (!end) {
        throw new Error(`INVALID_ANCHOR_DATE:${requested}`)
      }
      instant = end
    } else {
      const parsed = Date.parse(requested)
      if (!Number.isFinite(parsed)) {
        throw new Error(`INVALID_ANCHOR_DATE:${requested}`)
      }
      instant = new Date(parsed)
    }
  } else {
    const earliest = Number.isFinite(params.earliestNeededMs)
      ? params.earliestNeededMs
      : Date.now()
    instant = new Date(earliest)
  }
  const weeklyClose = cmeWeeklyCloseAtOrBefore(instant)
  return {
    weeklyClose,
    historyStartYmd: toUtcYyyyMmDd(weeklyClose),
  }
}

/** Oldest → newest windows of at most `maxWindowDays` (UTC calendar days), inclusive. */
export function buildUtcFillHistoryWindows(
  start: Date,
  end: Date,
  maxWindowDays: number,
): Array<{ start: Date; end: Date }> {
  const windows: Array<{ start: Date; end: Date }> = []
  let cursor = utcCalendarDay(start)
  const last = utcCalendarDay(end)
  const span = Math.max(1, Math.floor(maxWindowDays))

  while (cursor.getTime() <= last.getTime()) {
    const windowEnd = new Date(cursor)
    windowEnd.setUTCDate(windowEnd.getUTCDate() + (span - 1))
    if (windowEnd.getTime() > last.getTime()) {
      windowEnd.setTime(last.getTime())
    }
    windows.push({ start: new Date(cursor), end: new Date(windowEnd) })
    cursor = new Date(windowEnd)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return windows
}
