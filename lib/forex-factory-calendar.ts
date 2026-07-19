/**
 * Forex Factory economic calendar fetch + parse.
 *
 * Used for one-shot historical backfill: Jina Reader can load
 * https://www.forexfactory.com/calendar?week=may11.2026 while Investing's
 * widget ignores date ranges.
 */

import { isValid } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import {
  translateEconomicEventNameToFrench,
  type CronLang,
  type MappedFinancialEvent,
} from '@/lib/investing-calendar'

const JINA_READER = 'https://r.jina.ai/'
const FF_TIMEZONE = 'America/New_York'
const FF_CALENDAR_PAGE = 'https://www.forexfactory.com/calendar'

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
}

function jinaHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'text/markdown',
    'User-Agent': 'Mozilla/5.0 (compatible; CalendarSyncBot/1.0)',
  }
  if (process.env.JINA_API_KEY) {
    headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`
  }
  return headers
}

function splitMarkdownRow(line: string): string[] {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|')) return []
  return trimmed
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim())
}

function impactFromSprite(cell: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (/ff-impact-red/i.test(cell)) return 'HIGH'
  if (/ff-impact-ora/i.test(cell)) return 'MEDIUM'
  return 'LOW'
}

function parseFfClock(time: string): { hours: number; minutes: number } | null {
  const normalized = time.trim().toLowerCase()
  if (!normalized || normalized === 'all day' || normalized === 'tentative') {
    return null
  }
  const match = normalized.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/)
  if (!match) return null
  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const meridiem = match[3]
  if (meridiem === 'pm' && hours < 12) hours += 12
  if (meridiem === 'am' && hours === 12) hours = 0
  return { hours, minutes }
}

/** FF week slug like may11.2026 (month + day + year, no zero-pad on day). */
export function forexFactoryWeekSlug(date: Date): string {
  const months = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ]
  return `${months[date.getUTCMonth()]}${date.getUTCDate()}.${date.getUTCFullYear()}`
}

/** Sundays from the week containing `from` through the week containing `to` (UTC dates). */
export function listForexFactoryWeekStarts(from: Date, to: Date): Date[] {
  const start = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  )
  // Sunday on or before start
  while (start.getUTCDay() !== 0) {
    start.setUTCDate(start.getUTCDate() - 1)
  }

  const end = new Date(
    Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()),
  )
  const weeks: Date[] = []
  const cursor = new Date(start)
  while (cursor.getTime() <= end.getTime()) {
    weeks.push(new Date(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }
  return weeks
}

function parseWeekRangeYear(markdown: string): number | null {
  const match = markdown.match(
    /([A-Za-z]+)\s+\d{1,2},\s+(\d{4})\s*-\s*([A-Za-z]+)\s+\d{1,2},\s+(\d{4})/,
  )
  if (!match) return null
  return parseInt(match[2], 10)
}

function parseDayHeader(
  cell: string,
  year: number,
): Date | null {
  // "Mon May 11" or "May 11"
  const match = cell
    .trim()
    .match(/^(?:[A-Za-z]{3}\s+)?([A-Za-z]+)\s+(\d{1,2})$/)
  if (!match) return null
  const month = MONTHS[match[1].toLowerCase()]
  if (month == null) return null
  const day = parseInt(match[2], 10)
  const date = new Date(Date.UTC(year, month, day))
  return isValid(date) ? date : null
}

export function parseForexFactoryMarkdown(
  markdown: string,
  options: { yearHint?: number } = {},
): MappedFinancialEvent[] {
  const year =
    options.yearHint ?? parseWeekRangeYear(markdown) ?? new Date().getUTCFullYear()

  const events: MappedFinancialEvent[] = []
  let currentDay: Date | null = null
  let lastTime: string | null = null

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line.startsWith('|') || /^\|\s*---/.test(line)) continue

    const cells = splitMarkdownRow(line)
    if (cells.length === 0) continue

    // Day-only header: "| Mon May 11 |"
    if (cells.length <= 2 && cells[0] && !/\d{1,2}:\d{2}\s*(am|pm)/i.test(cells[0])) {
      const day = parseDayHeader(cells[0], year)
      if (day) {
        currentDay = day
        lastTime = null
      }
      continue
    }

    if (!currentDay) continue

    // Full row may repeat the day in cell 0.
    let offset = 0
    const dayFromRow = cells[0] ? parseDayHeader(cells[0], year) : null
    if (dayFromRow) {
      currentDay = dayFromRow
      offset = 1
    }
    const day = currentDay

    // Skip revised-date oddities like "Apr 18th"
    if (cells[offset] && /\d{1,2}(st|nd|rd|th)/i.test(cells[offset]) && !/am|pm|all day/i.test(cells[offset])) {
      continue
    }

    let timeCell = cells[offset] ?? ''
    let currency = cells[offset + 1] ?? ''
    let impactCell = cells[offset + 2] ?? ''
    let eventName = cells[offset + 3] ?? ''

    // Same-time continuation: empty time cell
    if (!timeCell && lastTime) {
      timeCell = lastTime
    }

    // Some rows put currency where time was empty already handled
    if (!/^[A-Z]{3}$/.test(currency) && /^[A-Z]{3}$/.test(timeCell)) {
      // "| USD | impact | title |" with inherited time
      eventName = impactCell
      impactCell = currency
      currency = timeCell
      timeCell = lastTime ?? ''
    }

    if (!/^[A-Z]{3}$/.test(currency)) continue
    if (!eventName || /^actual$/i.test(eventName)) continue
    // Drop markdown image alt leftovers
    eventName = eventName.replace(/!\[.*?\]\(.*?\)/g, '').trim()
    if (!eventName) continue

    const isAllDay = /^all day$/i.test(timeCell)
    let date: Date | null = null

    if (isAllDay || !timeCell) {
      date = new Date(day)
    } else {
      const clock = parseFfClock(timeCell)
      if (!clock) continue
      lastTime = timeCell
      const local = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, '0')}-${String(day.getUTCDate()).padStart(2, '0')} ${String(clock.hours).padStart(2, '0')}:${String(clock.minutes).padStart(2, '0')}:00`
      date = fromZonedTime(local, FF_TIMEZONE)
    }

    if (!date || !isValid(date)) continue

    events.push({
      title: `${currency} - ${eventName}`,
      date,
      importance: impactFromSprite(impactCell),
      type: 'ECONOMIC',
      sourceUrl: FF_CALENDAR_PAGE,
      country: currency,
      lang: 'en',
      timezone: 'UTC',
    })
  }

  return events
}

async function fetchViaJina(url: string): Promise<string> {
  const response = await fetch(`${JINA_READER}${url}`, {
    headers: jinaHeaders(),
    cache: 'no-store',
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(
      `Jina Reader failed for ${url}: ${response.status} ${response.statusText}`,
    )
  }
  if (!text.includes('ff-impact') && !/Currency/i.test(text)) {
    throw new Error(
      `Jina Reader returned no FF calendar content for ${url} (len=${text.length})`,
    )
  }
  return text
}

export async function fetchForexFactoryWeek(
  weekStart: Date,
): Promise<{ events: MappedFinancialEvent[]; sourceUrl: string; markdownLength: number }> {
  const slug = forexFactoryWeekSlug(weekStart)
  const sourceUrl = `${FF_CALENDAR_PAGE}?week=${slug}`
  console.log(`Fetching Forex Factory week via Jina: ${sourceUrl}`)

  let markdown: string | null = null
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt))
      }
      markdown = await fetchViaJina(sourceUrl)
      break
    } catch (error) {
      lastError = error
      console.warn(
        `FF week fetch failed (attempt ${attempt + 1}) for ${slug}:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  if (!markdown) {
    throw lastError instanceof Error
      ? lastError
      : new Error(`Failed to fetch FF week ${slug}`)
  }

  const events = parseForexFactoryMarkdown(markdown, {
    yearHint: weekStart.getUTCFullYear(),
  })
  return { events, sourceUrl, markdownLength: markdown.length }
}

function withFrenchLocales(events: MappedFinancialEvent[]): MappedFinancialEvent[] {
  const out: MappedFinancialEvent[] = []
  for (const event of events) {
    out.push({ ...event, lang: 'en' })
    const name = event.title.includes(' - ')
      ? event.title.slice(event.title.indexOf(' - ') + 3)
      : event.title
    out.push({
      ...event,
      lang: 'fr',
      title: event.country
        ? `${event.country} - ${translateEconomicEventNameToFrench(name)}`
        : translateEconomicEventNameToFrench(name),
      sourceUrl: FF_CALENDAR_PAGE,
    })
  }
  return out
}

/**
 * Backfill FF calendar events for [from, to] (inclusive), emitting en + fr rows.
 */
export async function backfillForexFactoryEvents(options: {
  from: Date
  to: Date
  langs?: CronLang[]
  pauseMs?: number
}): Promise<{
  events: MappedFinancialEvent[]
  diagnostics: Record<string, unknown>
}> {
  const langs = options.langs ?? (['en', 'fr'] as CronLang[])
  const pauseMs = options.pauseMs ?? 2000
  const weekStarts = listForexFactoryWeekStarts(options.from, options.to)
  const diagnostics: Record<string, unknown> = {
    source: 'forex-factory',
    via: 'jina',
    from: options.from.toISOString(),
    to: options.to.toISOString(),
    weeks: weekStarts.map((d) => forexFactoryWeekSlug(d)),
  }

  const allEn: MappedFinancialEvent[] = []
  const weekStats: Array<Record<string, unknown>> = []

  for (let i = 0; i < weekStarts.length; i++) {
    const weekStart = weekStarts[i]
    try {
      const { events, sourceUrl, markdownLength } =
        await fetchForexFactoryWeek(weekStart)
      const inRange = events.filter(
        (event) =>
          event.date.getTime() >= options.from.getTime() &&
          event.date.getTime() <= options.to.getTime() + 24 * 60 * 60 * 1000 - 1,
      )
      allEn.push(...inRange)
      weekStats.push({
        week: forexFactoryWeekSlug(weekStart),
        sourceUrl,
        markdownLength,
        parsed: events.length,
        inRange: inRange.length,
      })
    } catch (error) {
      weekStats.push({
        week: forexFactoryWeekSlug(weekStart),
        error: error instanceof Error ? error.message : String(error),
      })
    }

    if (i < weekStarts.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, pauseMs))
    }
  }

  diagnostics.weekStats = weekStats
  diagnostics.enParsedCount = allEn.length

  // Dedupe by title+date+lang later at upsert; collapse identical EN rows here.
  const seen = new Set<string>()
  const uniqueEn = allEn.filter((event) => {
    const key = `${event.title}|${event.date.toISOString()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const bilingual = withFrenchLocales(uniqueEn).filter((event) =>
    langs.includes(event.lang),
  )
  diagnostics.uniqueEn = uniqueEn.length
  diagnostics.totalRows = bilingual.length

  return { events: bilingual, diagnostics }
}
