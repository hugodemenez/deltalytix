import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  fetchInvestingEvents,
  type CronLang,
  type MappedFinancialEvent,
} from '@/lib/investing-calendar'

/**
 * Weekly financial-events sync from Investing.com.
 *
 * Investing's calendar widget (sslecal2.investing.com) is Cloudflare-protected
 * from datacenter IPs, so the cron fetches it through Jina Reader and parses
 * the returned markdown. Optional JINA_API_KEY raises rate limits.
 *
 * Not CRON_SECRET-gated today (unlike other cron handlers). Vercel only
 * schedules crons on production; the HTTP endpoint can still be invoked on
 * preview for verification.
 */
export const maxDuration = 60

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

    console.log(
      `Fetching Investing.com calendars via Jina for langs=${langs.join(',')}`,
    )

    const { events, diagnostics } = await fetchInvestingEvents(langs)

    if (events.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No events found',
          source: 'investing',
          langs,
          ...(debug ? { diagnostics } : {}),
        },
        { status: 404 },
      )
    }

    if (shouldStoreInDb) {
      console.log(`Storing ${events.length} Investing.com events...`)
      const storedCount = await upsertEvents(events)

      return NextResponse.json({
        success: true,
        source: 'investing',
        langs,
        count: events.length,
        storedCount,
        ...(debug
          ? {
              diagnostics,
              events: events.slice(0, 5),
            }
          : {}),
      })
    }

    return NextResponse.json({
      success: true,
      source: 'investing',
      langs,
      events,
      count: events.length,
      ...(debug ? { diagnostics } : {}),
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
