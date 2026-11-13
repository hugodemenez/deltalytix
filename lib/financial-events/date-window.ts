import { zonedMonthInterval } from "@/lib/calendar-timezone"

/**
 * Inclusive timestamptz bounds for a `FinancialEvent.date` filter.
 * Every read of this table must carry one of these windows. The production
 * query was `WHERE lang = $1` with no date predicate (~18k rows / call).
 */
export type FinancialEventDateWindow = {
  start: Date
  end: Date
}

export type LoadedFinancialEventRange = {
  startMs: number
  endMs: number
  lang: string
}

/** Widest civil timezone offset (Pacific/Kiritimati, UTC+14). */
export const FINANCIAL_EVENT_TZ_PAD_MS = 14 * 60 * 60 * 1000

const DAY_MS = 24 * 60 * 60 * 1000

function utcMonthStart(instant: Date): Date {
  return new Date(Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), 1))
}

function utcMonthEnd(instant: Date): Date {
  return new Date(
    Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  )
}

/**
 * Dashboard bootstrap (`getUserData`). The economic calendar opens on the
 * current month in the user's timezone, and the journal opens on today in
 * the browser timezone. The server knows neither zone, so this is the union
 * of "this month" across UTC±14h: at most two calendar months, padded so
 * each zone's month bounds fall inside the range. Navigating to another
 * month or journal day loads that view's window separately.
 */
export function dashboardFinancialEventWindow(
  now: Date = new Date(),
): FinancialEventDateWindow {
  const earliest = new Date(now.getTime() - FINANCIAL_EVENT_TZ_PAD_MS)
  const latest = new Date(now.getTime() + FINANCIAL_EVENT_TZ_PAD_MS)
  const start = utcMonthStart(earliest)
  start.setTime(start.getTime() - FINANCIAL_EVENT_TZ_PAD_MS)
  const end = utcMonthEnd(latest)
  end.setTime(end.getTime() + FINANCIAL_EVENT_TZ_PAD_MS)
  return { start, end }
}

/**
 * Month the economic calendar paints. Same bounds as the client filter in
 * `responsive-calendar.tsx` (`zonedMonthInterval`): `start <= date <= end`.
 * `zonedMonthDate` is already a wall-clock date from `toUserZonedTime`.
 */
export function calendarMonthFinancialEventWindow(
  zonedMonthDate: Date,
  timezone: string,
): FinancialEventDateWindow {
  const { startUtc, endUtc } = zonedMonthInterval(zonedMonthDate, timezone)
  return { start: startUtc, end: endUtc }
}

/**
 * One journal / news day. Those widgets keep an event when
 * `event.toDateString() === selected.toDateString()`, which is the browser
 * local calendar day — not the profile timezone. Local midnight through
 * 23:59:59.999 matches that comparison.
 */
export function localDayFinancialEventWindow(day: Date): FinancialEventDateWindow {
  const start = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    0,
    0,
    0,
    0,
  )
  const end = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    23,
    59,
    59,
    999,
  )
  return { start, end }
}

/** AI news tool: the start/end the model already asked for, inclusive. */
export function explicitFinancialEventWindow(
  start: Date | string,
  end: Date | string,
): FinancialEventDateWindow | null {
  const startDate = start instanceof Date ? start : new Date(start)
  const endDate = end instanceof Date ? end : new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null
  }
  if (startDate.getTime() > endDate.getTime()) return null
  return { start: startDate, end: endDate }
}

export function financialEventWhere(
  lang: string | undefined,
  window: FinancialEventDateWindow,
): { lang?: string; date: { gte: Date; lte: Date } } {
  return {
    ...(lang ? { lang } : {}),
    date: { gte: window.start, lte: window.end },
  }
}

export function financialEventRangeCovers(
  loaded: readonly LoadedFinancialEventRange[],
  needed: LoadedFinancialEventRange,
): boolean {
  return loaded.some(
    (range) =>
      range.lang === needed.lang &&
      range.startMs <= needed.startMs &&
      range.endMs >= needed.endMs,
  )
}

/** Span of a window in days, for tests and for spotting an unbounded range. */
export function financialEventWindowDays(window: FinancialEventDateWindow): number {
  return (window.end.getTime() - window.start.getTime()) / DAY_MS
}
