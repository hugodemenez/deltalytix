import { zonedMonthInterval } from "@/lib/calendar-timezone"

/**
 * Inclusive UTC bounds for a FinancialEvent.date filter.
 * `from` and `to` match the `>=` / `<=` checks the widgets already apply.
 */
export type FinancialEventDateWindow = {
  from: Date
  to: Date
}

/**
 * Pad around a browser-local calendar day. The journal and news widgets
 * compare `toDateString()`, which follows the browser zone (up to ±14h from UTC).
 * The extra rows are dropped by that same comparison, so the events on screen
 * stay the same.
 */
export const JOURNAL_DAY_TIMEZONE_PAD_MS = 14 * 60 * 60 * 1000

/**
 * First dashboard load, before the client asks for a specific month.
 * Covers the previous UTC month through the next one, which includes the
 * calendar month on screen in any timezone (offsets are at most 14 hours)
 * and the journal's today.
 */
export function dashboardFinancialEventWindow(
  now: Date = new Date(),
): FinancialEventDateWindow {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  return {
    from: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
    to: new Date(Date.UTC(year, month + 2, 0, 23, 59, 59, 999)),
  }
}

/** Daily calendar: the zoned month the grid filters to, inclusive. */
export function calendarMonthEventWindow(
  zonedMonthDate: Date,
  timezone: string,
): FinancialEventDateWindow {
  const { startUtc, endUtc } = zonedMonthInterval(zonedMonthDate, timezone)
  return { from: startUtc, to: endUtc }
}

/** Journal, news impact, and the editor: one browser-local day, padded. */
export function journalDayEventWindow(date: Date): FinancialEventDateWindow {
  const start = new Date(date.getTime())
  start.setHours(0, 0, 0, 0)
  const end = new Date(date.getTime())
  end.setHours(23, 59, 59, 999)
  return {
    from: new Date(start.getTime() - JOURNAL_DAY_TIMEZONE_PAD_MS),
    to: new Date(end.getTime() + JOURNAL_DAY_TIMEZONE_PAD_MS),
  }
}

export function financialEventWhere(
  lang: string | undefined,
  window: FinancialEventDateWindow,
): { lang?: string; date: { gte: Date; lte: Date } } {
  return {
    ...(lang ? { lang } : {}),
    date: { gte: window.from, lte: window.to },
  }
}

/**
 * Missing or inverted bounds mean "no rows", matching the in-memory
 * `eventDate >= start && eventDate <= end` filter. Omitting the range uses
 * the dashboard window so a caller cannot scan the whole table.
 */
export function parseFinancialEventRange(
  range: { from: string | Date; to: string | Date } | undefined,
  now: Date = new Date(),
): FinancialEventDateWindow | null {
  if (!range) return dashboardFinancialEventWindow(now)
  const from = range.from instanceof Date ? range.from : new Date(range.from)
  const to = range.to instanceof Date ? range.to : new Date(range.to)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
  if (from.getTime() > to.getTime()) return null
  return { from, to }
}

export function windowCovers(
  loaded: readonly FinancialEventDateWindow[],
  needed: FinancialEventDateWindow,
): boolean {
  const from = needed.from.getTime()
  const to = needed.to.getTime()
  return loaded.some(
    (range) => range.from.getTime() <= from && range.to.getTime() >= to,
  )
}

/** Keep existing order, replace rows that share an id, append new ids. */
export function mergeFinancialEvents<T extends { id: string }>(
  existing: readonly T[],
  incoming: readonly T[],
): T[] {
  if (incoming.length === 0) return existing.slice()
  const byId = new Map<string, T>()
  for (const event of existing) byId.set(event.id, event)
  for (const event of incoming) byId.set(event.id, event)
  return [...byId.values()]
}
