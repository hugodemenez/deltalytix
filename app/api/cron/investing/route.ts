import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValid } from 'date-fns'

/**
 * Weekly financial-events sync.
 *
 * Historically scraped Investing.com via a headless browser. That path is now
 * blocked by Cloudflare ("Just a moment...") from Vercel Sandbox IPs.
 * Forex Factory publishes a public weekly JSON feed that works with a plain
 * fetch, so the cron uses that instead.
 *
 * Note: this route is intentionally not CRON_SECRET-gated today (unlike other
 * cron handlers). Vercel only *schedules* crons on production, but the HTTP
 * endpoint can still be invoked manually on preview/production.
 */
export const maxDuration = 60

type CronLang = 'fr' | 'en'

interface ForexFactoryEvent {
  title: string
  country: string
  date: string
  impact: string
  forecast?: string
  previous?: string
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

const FF_CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'
const FF_CALENDAR_PAGE = 'https://www.forexfactory.com/calendar'

function mapImpactToImportance(impact: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  switch (impact.trim().toLowerCase()) {
    case 'high':
      return 'HIGH'
    case 'medium':
      return 'MEDIUM'
    default:
      // Low / Holiday / unknown
      return 'LOW'
  }
}

async function fetchForexFactoryJson(): Promise<ForexFactoryEvent[]> {
  // FF rate-limits to ~2 requests / 5 minutes across export formats.
  let lastError: Error | null = null
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(FF_CALENDAR_URL, {
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (compatible; DeltalytixBot/1.0; +https://deltalytix.com)',
      },
      // Avoid Next.js fetch cache so the weekly cron always sees fresh data.
      cache: 'no-store',
    })

    if (response.ok) {
      const payload = (await response.json()) as unknown
      if (!Array.isArray(payload)) {
        throw new Error('Forex Factory feed returned a non-array payload')
      }
      return payload as ForexFactoryEvent[]
    }

    lastError = new Error(
      `Forex Factory feed failed: ${response.status} ${response.statusText}`,
    )
    if (response.status !== 429 && response.status < 500) {
      throw lastError
    }

    const delayMs = Math.min(30_000, 2_000 * 2 ** attempt)
    console.warn(
      `Forex Factory feed attempt ${attempt + 1} failed (${response.status}); retrying in ${delayMs}ms`,
    )
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  throw lastError ?? new Error('Forex Factory feed failed after retries')
}

async function fetchForexFactoryEvents(lang: CronLang): Promise<{
  events: MappedFinancialEvent[]
  diagnostics?: Record<string, unknown>
}> {
  console.log(`Fetching Forex Factory calendar from ${FF_CALENDAR_URL} (lang=${lang})...`)

  const rawEvents = await fetchForexFactoryJson()

  const events: MappedFinancialEvent[] = []
  let skippedInvalidDate = 0
  let skippedMissingTitle = 0

  for (const raw of rawEvents) {
    const titleText = raw.title?.trim()
    const currency = raw.country?.trim()
    if (!titleText || !currency) {
      skippedMissingTitle++
      continue
    }

    const date = new Date(raw.date)
    if (!isValid(date)) {
      skippedInvalidDate++
      continue
    }

    events.push({
      // Keep the historical "USD - Event" title shape used by the Investing scraper.
      title: `${currency} - ${titleText}`,
      date,
      importance: mapImpactToImportance(raw.impact || 'Low'),
      type: 'ECONOMIC',
      sourceUrl: FF_CALENDAR_PAGE,
      country: currency,
      // FF titles are English-only; we still tag rows with the requested lang so
      // both weekly cron invocations (en/fr) populate their locale filters.
      lang,
      timezone: 'UTC',
    })
  }

  const diagnostics = {
    feedUrl: FF_CALENDAR_URL,
    rawCount: rawEvents.length,
    mappedCount: events.length,
    skippedInvalidDate,
    skippedMissingTitle,
    sample: events.slice(0, 3).map((e) => ({
      title: e.title,
      date: e.date.toISOString(),
      importance: e.importance,
      country: e.country,
      lang: e.lang,
    })),
  }

  console.log('Forex Factory fetch summary:', diagnostics)

  return { events, diagnostics }
}

async function upsertEvents(events: MappedFinancialEvent[]) {
  const storedEvents = await Promise.all(
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

  return storedEvents.filter(Boolean).length
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const langParam = searchParams.get('lang')
    const shouldStoreInDb = searchParams.get('db') === 'true'
    const debug = searchParams.get('debug') === '1'

    // Default to both locales so a single cron invocation (and a single FF
    // fetch) can populate en + fr without tripping Forex Factory rate limits.
    const langs: CronLang[] =
      langParam === 'en' || langParam === 'fr' ? [langParam] : ['en', 'fr']

    // Fetch once, then project into each requested lang.
    const { events: baseEvents, diagnostics } = await fetchForexFactoryEvents(langs[0])
    if (baseEvents.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No events found',
          ...(debug ? { diagnostics } : {}),
        },
        { status: 404 },
      )
    }

    const eventsByLang = Object.fromEntries(
      langs.map((lang) => [
        lang,
        baseEvents.map((event) => ({ ...event, lang })),
      ]),
    ) as Record<CronLang, MappedFinancialEvent[]>

    const allEvents = langs.flatMap((lang) => eventsByLang[lang])

    if (shouldStoreInDb) {
      console.log(`Storing events in database for langs=${langs.join(',')}...`)
      const storedCount = await upsertEvents(allEvents)

      return NextResponse.json({
        success: true,
        source: 'forexfactory',
        langs,
        count: allEvents.length,
        storedCount,
        ...(debug
          ? {
              diagnostics,
              events: allEvents.slice(0, 5),
            }
          : {}),
      })
    }

    return NextResponse.json({
      success: true,
      source: 'forexfactory',
      langs,
      events: allEvents,
      count: allEvents.length,
      ...(debug ? { diagnostics } : {}),
    })
  } catch (error) {
    console.error('Error in GET route:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch financial events',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
