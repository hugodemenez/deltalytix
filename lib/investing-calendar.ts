/**
 * Investing.com economic calendar fetch + parse.
 *
 * Direct requests to sslecal2.investing.com are blocked by Cloudflare from
 * datacenter IPs. Jina Reader runs a real browser fetch and returns the widget
 * as markdown, which we parse into events.
 *
 * Optional: set JINA_API_KEY for higher rate limits.
 * Optional: INVESTING_SCRAPE_MODE=browser to try agent-browser first (needs CF bypass).
 */

import { isValid } from 'date-fns'

export type CronLang = 'fr' | 'en'

export interface MappedFinancialEvent {
  title: string
  date: Date
  importance: 'HIGH' | 'MEDIUM' | 'LOW'
  type: string
  sourceUrl: string
  country: string
  lang: CronLang
  timezone: string
}

const LANG_TO_INVESTING: Record<CronLang, string> = {
  fr: '5',
  en: '1',
}

const INVESTING_CALENDAR_PAGE: Record<CronLang, string> = {
  en: 'https://www.investing.com/economic-calendar/',
  fr: 'https://fr.investing.com/economic-calendar/',
}

const ENGLISH_MONTHS: Record<string, string> = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12',
}

const FRENCH_MONTHS: Record<string, string> = {
  janvier: '01',
  février: '02',
  fevrier: '02',
  mars: '03',
  avril: '04',
  mai: '05',
  juin: '06',
  juillet: '07',
  août: '08',
  aout: '08',
  septembre: '09',
  octobre: '10',
  novembre: '11',
  décembre: '12',
  decembre: '12',
}

const JINA_READER = 'https://r.jina.ai/'

function investingWidgetUrl(lang: CronLang): string {
  // timeZone=55 is UTC on Investing's widget.
  return `https://sslecal2.investing.com/?timeZone=55&lang=${LANG_TO_INVESTING[lang]}`
}

function forexprosWidgetUrl(lang: CronLang): string {
  // Same Fusion Media / Investing widget host (fallback if investing.com is rate-limited on Jina).
  return `https://sslecal2.forexprostools.com/?timeZone=55&lang=${LANG_TO_INVESTING[lang]}`
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

function looksLikeCloudflareOrError(text: string): boolean {
  return (
    /just a moment/i.test(text) ||
    /returned error 403/i.test(text) ||
    /AuthenticationRequiredError/i.test(text) ||
    /AbuseAlleviationError/i.test(text)
  )
}

function hasCalendarContent(text: string): boolean {
  if (looksLikeCloudflareOrError(text) && !text.includes('| Time |')) {
    return false
  }
  return (
    text.includes('| Time |') ||
    text.includes('| Heure |') ||
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/i.test(
      text,
    ) ||
    /(?:Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)\s+\d+/i.test(text)
  )
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
  if (!hasCalendarContent(text)) {
    throw new Error(
      `Jina Reader returned no calendar content for ${url} (len=${text.length})`,
    )
  }
  return text
}

export async function fetchInvestingMarkdown(lang: CronLang): Promise<{
  markdown: string
  sourceUrl: string
}> {
  // Prefer forexprostools host first: same Investing/Fusion Media widget, but
  // Jina is less likely to have the domain abuse-blocked than investing.com.
  const candidates = [forexprosWidgetUrl(lang), investingWidgetUrl(lang)]
  const errors: string[] = []

  for (const url of candidates) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          const delayMs = 2000 * attempt
          console.log(`Retrying Jina fetch in ${delayMs}ms for ${url}`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
        console.log(`Fetching Investing calendar via Jina: ${url}`)
        const markdown = await fetchViaJina(url)
        return { markdown, sourceUrl: url }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(
          `Investing fetch failed for ${url} (attempt ${attempt + 1}): ${message}`,
        )
        errors.push(message)
      }
    }
  }

  throw new Error(
    `Failed to fetch Investing.com calendar for lang=${lang}: ${errors.join(' | ')}`,
  )
}

function parseEnglishDay(dateStr: string): Date | null {
  const normalized = dateStr.replace(/,/g, '').trim()
  const parts = normalized.split(/\s+/)
  const [, month, day, year] = parts
  const monthNum = ENGLISH_MONTHS[month?.toLowerCase() ?? '']
  if (!day || !monthNum || !year) return null
  const parsed = new Date(
    Date.UTC(parseInt(year, 10), parseInt(monthNum, 10) - 1, parseInt(day, 10)),
  )
  return isValid(parsed) ? parsed : null
}

function parseFrenchDay(dateStr: string): Date | null {
  // e.g. "Lundi 13 juillet 2026" or "dimanche 19 juillet 2026"
  const parts = dateStr.trim().split(/\s+/)
  if (parts.length < 4) return null
  const [, day, month, year] = parts
  const monthNum = FRENCH_MONTHS[month?.toLowerCase() ?? '']
  if (!day || !monthNum || !year) return null
  const parsed = new Date(
    Date.UTC(parseInt(year, 10), parseInt(monthNum, 10) - 1, parseInt(day, 10)),
  )
  return isValid(parsed) ? parsed : null
}

function splitMarkdownRow(line: string): string[] {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|')) return []
  return trimmed
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim())
}

function combineUtcDateAndTime(day: Date, time: string): Date | null {
  const match = time.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const combined = new Date(
    Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      hours,
      minutes,
    ),
  )
  return isValid(combined) ? combined : null
}

function inferImportance(eventName: string, impactCell: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  const impact = impactCell.trim()
  // Markdown usually drops bull icons; keep heuristics for holidays / explicit markers.
  if (/holiday/i.test(eventName) || /^holiday$/i.test(impact)) return 'LOW'
  const bullish = (impact.match(/bull|★|⭐/gi) || []).length
  if (bullish >= 3 || /high/i.test(impact)) return 'HIGH'
  if (bullish === 2 || /medium/i.test(impact)) return 'MEDIUM'
  if (bullish === 1 || /low/i.test(impact)) return 'LOW'
  return 'MEDIUM'
}

/**
 * Parse Investing widget markdown from Jina Reader (EN table layout).
 */
export function parseInvestingMarkdown(
  markdown: string,
  lang: CronLang,
): MappedFinancialEvent[] {
  const sourcePage = INVESTING_CALENDAR_PAGE[lang]
  const events: MappedFinancialEvent[] = []
  let currentDay: Date | null = null

  const lines = markdown.split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line === '|' || /^\|?\s*---/.test(line)) continue

    // Day headers may be a one-cell markdown row or a bare French date line.
    const enDayMatch = line.match(
      /^\|\s*((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+[^|]+?)\s*\|?\s*$/i,
    )
    if (enDayMatch) {
      currentDay = parseEnglishDay(enDayMatch[1])
      continue
    }

    const frDayMatch = line.match(
      /^(?:\|\s*)?((?:Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)\s+\d{1,2}\s+\S+\s+\d{4})\s*\|?\s*$/i,
    )
    if (frDayMatch) {
      currentDay = parseFrenchDay(frDayMatch[1])
      continue
    }

    if (!currentDay) continue

    const cells = splitMarkdownRow(line)
    if (cells.length >= 4) {
      // Table row: Time | Cur. | Imp. | Event | ...
      const [time, currency, impact, eventName] = cells
      if (!time || !eventName) continue
      if (/^time$/i.test(time) || /^heure$/i.test(time)) continue

      const isAllDay = /^(all day|toute la journée)$/i.test(time)
      const date = isAllDay
        ? new Date(currentDay)
        : combineUtcDateAndTime(currentDay, time)
      if (!date) continue

      const currencyCode = currency?.trim() || ''
      const title = currencyCode
        ? `${currencyCode} - ${eventName.trim()}`
        : eventName.trim()

      events.push({
        title,
        date,
        importance: inferImportance(eventName, impact || ''),
        type: 'ECONOMIC',
        sourceUrl: sourcePage,
        country: currencyCode || 'Holiday',
        lang,
        timezone: 'UTC',
      })
      continue
    }

    // French widget sometimes renders as plaintext:
    // "06:00 NOK Production manufacturière (Mensuel) (Mai)0,7%0,4%-0,6%"
    const plainMatch = line.match(
      /^(\d{1,2}:\d{2}|Toute la journée|All Day)\s+([A-Z]{3})?\s*(.+)$/i,
    )
    if (plainMatch) {
      const time = plainMatch[1]
      const currencyCode = (plainMatch[2] || '').trim()
      let eventName = plainMatch[3].trim()
      // Strip trailing actual/forecast/previous number blobs glued to the name.
      eventName = eventName.replace(/(-?\d[\d\s.,]*[A-Za-z%]*)+$/g, '').trim()
      if (!eventName) continue

      const isAllDay = /^(all day|toute la journée)$/i.test(time)
      const date = isAllDay
        ? new Date(currentDay)
        : combineUtcDateAndTime(currentDay, time)
      if (!date) continue

      events.push({
        title: currencyCode ? `${currencyCode} - ${eventName}` : eventName,
        date,
        importance: inferImportance(eventName, ''),
        type: 'ECONOMIC',
        sourceUrl: sourcePage,
        country: currencyCode || 'Holiday',
        lang,
        timezone: 'UTC',
      })
    }
  }

  return events
}

/**
 * Investing markdown drops bull-icon importance. Optionally overlay High/Medium/Low
 * from Forex Factory's public JSON when currency + UTC minute match.
 */
async function enrichImportanceFromForexFactory(
  events: MappedFinancialEvent[],
): Promise<number> {
  try {
    const response = await fetch(
      'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; CalendarSyncBot/1.0)',
        },
        cache: 'no-store',
      },
    )
    if (!response.ok) return 0

    const payload = (await response.json()) as Array<{
      title?: string
      country?: string
      date?: string
      impact?: string
    }>
    if (!Array.isArray(payload)) return 0

    const impactByKey = new Map<string, 'HIGH' | 'MEDIUM' | 'LOW'>()
    for (const raw of payload) {
      const country = raw.country?.trim()
      const date = raw.date ? new Date(raw.date) : null
      if (!country || !date || !isValid(date)) continue
      const impact = (raw.impact || '').trim().toLowerCase()
      const importance =
        impact === 'high' ? 'HIGH' : impact === 'medium' ? 'MEDIUM' : 'LOW'
      impactByKey.set(`${country}|${date.toISOString().slice(0, 16)}`, importance)
    }

    let enriched = 0
    for (const event of events) {
      const key = `${event.country}|${event.date.toISOString().slice(0, 16)}`
      const importance = impactByKey.get(key)
      if (importance) {
        event.importance = importance
        enriched++
      }
    }
    return enriched
  } catch (error) {
    console.warn('Forex Factory importance enrichment skipped:', error)
    return 0
  }
}

export async function fetchInvestingEvents(langs: CronLang[]): Promise<{
  events: MappedFinancialEvent[]
  diagnostics: Record<string, unknown>
}> {
  const diagnostics: Record<string, unknown> = { source: 'investing', via: 'jina' }
  const allEvents: MappedFinancialEvent[] = []

  // One EN widget fetch (reliable markdown table). Jina's FR widget render is
  // often stale/plaintext, so FR locale rows reuse the EN schedule — same
  // bilingual tagging approach as the previous Forex Factory sync.
  const { markdown, sourceUrl } = await fetchInvestingMarkdown('en')
  diagnostics.widgetUrl = sourceUrl
  diagnostics.markdownLength = markdown.length

  const enEvents = parseInvestingMarkdown(markdown, 'en')
  diagnostics.enParsedCount = enEvents.length

  for (const lang of langs) {
    if (lang === 'en') {
      allEvents.push(...enEvents)
      continue
    }

    allEvents.push(
      ...enEvents.map((event) => ({
        ...event,
        lang: 'fr' as const,
        sourceUrl: INVESTING_CALENDAR_PAGE.fr,
      })),
    )
    diagnostics.frFallback = 'cloned-from-en'
  }

  const enriched = await enrichImportanceFromForexFactory(allEvents)
  diagnostics.importanceEnrichedFromFf = enriched

  return { events: allEvents, diagnostics }
}
