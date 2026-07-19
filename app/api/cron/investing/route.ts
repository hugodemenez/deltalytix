import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValid } from 'date-fns'
import { scrapeUrlsWithAgentBrowser } from '@/lib/browser-sandbox'

/**
 * Weekly financial-events sync from Investing.com.
 *
 * Scrapes sslecal2.investing.com via Vercel agent-browser (Sandbox + Chrome),
 * which can wait through Cloudflare challenges that plain HTTP / --dump-dom
 * cannot.
 *
 * Not CRON_SECRET-gated today (unlike other cron handlers). Vercel only
 * schedules crons on production; the HTTP endpoint can still be invoked on
 * preview for verification.
 */
export const maxDuration = 300

type CronLang = 'fr' | 'en'

interface InvestingEvent {
  time: string
  currency: string
  impact: string
  event: string
  timestamp: string | null
  country: string
  eventId: string | null
  sourceUrl: string
  lang: CronLang
  timezone: string
}

interface MappedFinancialEvent {
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

const FRENCH_MONTHS: Record<string, string> = {
  janvier: '01',
  février: '02',
  mars: '03',
  avril: '04',
  mai: '05',
  juin: '06',
  juillet: '07',
  août: '08',
  septembre: '09',
  octobre: '10',
  novembre: '11',
  décembre: '12',
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

function investingCalendarUrl(lang: CronLang): string {
  return `https://sslecal2.investing.com/?timeZone=55&lang=${LANG_TO_INVESTING[lang]}`
}

function parseCalendarDay(dateStr: string, lang: CronLang): Date | null {
  try {
    if (lang === 'fr') {
      // e.g. "Mercredi 7 mai 2025"
      const parts = dateStr.trim().split(/\s+/)
      const [, day, month, year] = parts
      const monthNum = FRENCH_MONTHS[month?.toLowerCase() ?? '']
      if (!day || !monthNum || !year) return null
      const parsed = new Date(
        Date.UTC(parseInt(year, 10), parseInt(monthNum, 10) - 1, parseInt(day, 10)),
      )
      return isValid(parsed) ? parsed : null
    }

    // e.g. "Wednesday, May 7, 2025" or "Wednesday May 7 2025"
    const normalized = dateStr.replace(/,/g, '')
    const enParts = normalized.trim().split(/\s+/)
    const [, month, day, year] = enParts
    const monthNum = ENGLISH_MONTHS[month?.toLowerCase() ?? '']
    if (!day || !monthNum || !year) return null
    const parsed = new Date(
      Date.UTC(parseInt(year, 10), parseInt(monthNum, 10) - 1, parseInt(day, 10)),
    )
    return isValid(parsed) ? parsed : null
  } catch (error) {
    console.error('Error parsing current date:', error)
    return null
  }
}

function mapImpactToImportance(impact: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  const filledBulls = (
    impact.match(/grayFullBullishIcon|data-img_key="fullBullish"/g) || []
  ).length
  switch (filledBulls) {
    case 3:
      return 'HIGH'
    case 2:
      return 'MEDIUM'
    default:
      return 'LOW'
  }
}

function htmlDiagnostics(html: string) {
  return {
    htmlLength: html.length,
    hasEventRowId: html.includes('eventRowId_'),
    hasTheDay: html.includes('theDay'),
    hasEventTimestamp: html.includes('event_timestamp'),
    titleMatch: html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null,
    looksLikeCloudflare: /just a moment/i.test(html),
    htmlPreview: html.replace(/\s+/g, ' ').trim().slice(0, 400),
  }
}

function parseInvestingHtml(html: string, lang: CronLang): MappedFinancialEvent[] {
  const events: InvestingEvent[] = []
  const tableRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g

  let tableMatch
  let currentEvent: Partial<InvestingEvent> | null = null
  let currentDate: Date | null = null
  let rowCount = 0
  let dateRowCount = 0
  let eventRowCount = 0
  let eventInfoRowCount = 0

  while ((tableMatch = tableRegex.exec(html)) !== null) {
    rowCount++
    const fullRow = tableMatch[0]
    const row = tableMatch[1]

    if (row.includes('theDay')) {
      dateRowCount++
      const dateMatch = row.match(/<td[^>]*class="theDay"[^>]*>([^<]+)<\/td>/)
      if (dateMatch) {
        const dateStr = dateMatch[1].trim()
        currentDate = parseCalendarDay(dateStr, lang)
        if (!currentDate) {
          console.log('Invalid current date created:', { dateStr, lang })
        }
      }
      continue
    }

    if (row.includes('eventInfo')) {
      eventInfoRowCount++
      if (currentEvent) {
        const sourceUrlMatch = row.match(/<a[^>]*href="([^"]+)"[^>]*>/)
        if (sourceUrlMatch) {
          currentEvent.sourceUrl = sourceUrlMatch[1]
        }
        events.push(currentEvent as InvestingEvent)
        currentEvent = null
      }
      continue
    }

    if (!fullRow.includes('eventRowId_')) {
      continue
    }

    if (currentEvent) {
      events.push(currentEvent as InvestingEvent)
      currentEvent = null
    }

    eventRowCount++

    const eventIdMatch = fullRow.match(/event_attr_id="(\d+)"/)
    const timestampMatch = fullRow.match(/event_timestamp="([^"]+)"/)
    const eventTimestamp = timestampMatch ? timestampMatch[1] : null
    const eventId = eventIdMatch ? eventIdMatch[1] : null

    const timeMatch = row.match(/<td[^>]*class="[^"]*time[^"]*"[^>]*>([^<]+)<\/td>/)
    if (!timeMatch) continue

    const time = timeMatch[1].trim()

    if (time === 'Toute la journée' || time === 'All Day') {
      if (!currentDate) continue

      const countryMatch = row.match(
        /<span[^>]*title="([^"]+)"[^>]*class="[^"]*ceFlags[^"]*"[^>]*>/,
      )
      const eventMatch = row.match(/<td[^>]*class="[^"]*event[^"]*"[^>]*>([^<]+)<\/td>/)

      if (countryMatch && eventMatch) {
        currentEvent = {
          time,
          currency: '',
          impact: '',
          event: eventMatch[1].trim(),
          timestamp: currentDate.toISOString(),
          country: countryMatch[1],
          eventId,
          sourceUrl: '',
          lang,
          timezone: 'UTC',
        }
      }
      continue
    }

    if (!eventTimestamp) continue

    const flagMatch = row.match(
      /<span[^>]*title="([^"]+)"[^>]*class="[^"]*ceFlags[^"]*"[^>]*>.*?<\/span>\s*([A-Z]{3})/,
    )
    if (!flagMatch) continue

    const country = flagMatch[1]
    const currency = flagMatch[2]

    const impactMatch = row.match(
      /<td[^>]*class="[^"]*sentiment[^"]*"[^>]*>([\s\S]*?)<\/td>/,
    )
    if (!impactMatch) continue

    const impact = impactMatch[1]

    const eventMatch = row.match(
      /<td[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/td>/,
    )
    if (!eventMatch) continue

    const eventName = eventMatch[1]
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()

    if (!eventName) continue

    try {
      const [datePart, timePart] = eventTimestamp.split(' ')
      if (!datePart || !timePart) continue

      const [year, month, day] = datePart.split('-').map(Number)
      const [hours, minutes] = timePart.split(':').map(Number)

      if (
        isNaN(year) ||
        isNaN(month) ||
        isNaN(day) ||
        isNaN(hours) ||
        isNaN(minutes)
      ) {
        continue
      }

      const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes))
      if (!isValid(utcDate)) continue

      currentEvent = {
        time,
        currency,
        impact,
        event: eventName,
        timestamp: utcDate.toISOString(),
        country,
        eventId: eventId || '',
        sourceUrl: '',
        lang,
        timezone: 'UTC',
      }
    } catch (error) {
      console.error('Error parsing timestamp:', error)
    }
  }

  if (currentEvent) {
    events.push(currentEvent as InvestingEvent)
  }

  console.log('Parsing Summary:', {
    lang,
    rowCount,
    dateRowCount,
    eventRowCount,
    eventInfoRowCount,
    eventsCreated: events.length,
  })

  return events.map((event) => ({
    title: event.currency ? `${event.currency} - ${event.event}` : event.event,
    date: new Date(event.timestamp!),
    importance: mapImpactToImportance(event.impact),
    type: 'ECONOMIC',
    sourceUrl: event.sourceUrl || '',
    country: event.country,
    lang: event.lang,
    timezone: event.timezone,
  }))
}

async function upsertEvents(events: MappedFinancialEvent[]) {
  const stored = await Promise.all(
    events.map(async (event) => {
      try {
        return prisma.financialEvent.upsert({
          where: {
            title_date_lang_timezone: {
              title: event.title,
              date: event.date,
              lang: event.lang,
              timezone: event.timezone,
            },
          },
          update: {
            importance: event.importance,
            sourceUrl: event.sourceUrl,
            country: event.country,
            updatedAt: new Date(),
          },
          create: {
            title: event.title,
            date: event.date,
            importance: event.importance,
            type: event.type,
            sourceUrl: event.sourceUrl,
            country: event.country,
            lang: event.lang,
            timezone: event.timezone,
          },
        })
      } catch (error) {
        console.error(`Error processing event ${event.title}:`, error)
        return null
      }
    }),
  )

  return stored.filter(Boolean).length
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const langParam = searchParams.get('lang')
    const shouldStoreInDb = searchParams.get('db') === 'true'
    const debug = searchParams.get('debug') === '1'

    const langs: CronLang[] =
      langParam === 'en' || langParam === 'fr' ? [langParam] : ['en', 'fr']

    const urls = langs.map(investingCalendarUrl)
    console.log(
      `Fetching Investing.com calendars via agent-browser for langs=${langs.join(',')}`,
    )

    const htmlPages = await scrapeUrlsWithAgentBrowser(urls, {
      timeoutMs: 5 * 60 * 1000,
    })

    const diagnosticsByLang: Record<string, unknown> = {}
    const allEvents: MappedFinancialEvent[] = []

    for (let i = 0; i < langs.length; i++) {
      const lang = langs[i]
      const html = htmlPages[i] ?? ''
      diagnosticsByLang[lang] = htmlDiagnostics(html)
      allEvents.push(...parseInvestingHtml(html, lang))
    }

    if (allEvents.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No events found',
          source: 'investing',
          langs,
          ...(debug ? { diagnostics: diagnosticsByLang } : {}),
        },
        { status: 404 },
      )
    }

    if (shouldStoreInDb) {
      console.log(`Storing ${allEvents.length} Investing.com events...`)
      const storedCount = await upsertEvents(allEvents)

      return NextResponse.json({
        success: true,
        source: 'investing',
        langs,
        count: allEvents.length,
        storedCount,
        ...(debug
          ? {
              diagnostics: diagnosticsByLang,
              events: allEvents.slice(0, 5),
            }
          : {}),
      })
    }

    return NextResponse.json({
      success: true,
      source: 'investing',
      langs,
      events: allEvents,
      count: allEvents.length,
      ...(debug ? { diagnostics: diagnosticsByLang } : {}),
    })
  } catch (error) {
    console.error('Error in GET route:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch events from Investing.com',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
