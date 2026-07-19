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

async function replaceEventsInWindow(events: MappedFinancialEvent[]) {
  const byLang = new Map<CronLang, MappedFinancialEvent[]>()
  for (const event of events) {
    const list = byLang.get(event.lang) ?? []
    list.push(event)
    byLang.set(event.lang, list)
  }

  // Clear the union date window for every synced locale so leftover English
  // `fr` clones outside the FR widget week are removed.
  const allTimes = events.map((event) => event.date.getTime())
  const minDate = new Date(Math.min(...allTimes))
  const maxDate = new Date(Math.max(...allTimes))

  let storedCount = 0

  for (const lang of byLang.keys()) {
    const deleted = await prisma.financialEvent.deleteMany({
      where: {
        lang,
        timezone: 'UTC',
        date: {
          gte: minDate,
          lte: maxDate,
        },
      },
    })
    console.log(
      `Cleared ${deleted.count} existing ${lang} events between ${minDate.toISOString()} and ${maxDate.toISOString()}`,
    )
  }

  // Extra sweep: any remaining English-shaped French rows (from older syncs),
  // including ones outside this week's window.
  if (byLang.has('fr')) {
    const englishFrCleanup = await prisma.financialEvent.deleteMany({
      where: {
        lang: 'fr',
        OR: [
          { title: { contains: 'Exports (' } },
          { title: { contains: 'Imports (' } },
          { title: { contains: 'Trade Balance' } },
          { title: { contains: 'House Price Index' } },
          { title: { contains: '(MoM)' } },
          { title: { contains: '(YoY)' } },
          { title: { contains: '(QoQ)' } },
          { title: { contains: ' Speech' } },
          { title: { contains: 'Holiday' } },
          { title: { contains: 'Employment Change' } },
          { title: { contains: 'Interest Rate Decision' } },
          { title: { contains: ' (Jan)' } },
          { title: { contains: ' (Feb)' } },
          { title: { contains: ' (Mar)' } },
          { title: { contains: ' (Apr)' } },
          { title: { contains: ' (May)' } },
          { title: { contains: ' (Jun)' } },
          { title: { contains: ' (Jul)' } },
          { title: { contains: ' (Aug)' } },
          { title: { contains: ' (Sep)' } },
          { title: { contains: ' (Oct)' } },
          { title: { contains: ' (Nov)' } },
          { title: { contains: ' (Dec)' } },
          { title: { contains: 'CPI (' } },
          { title: { contains: 'PPI (' } },
          { title: { contains: 'GDP (' } },
          { title: { contains: 'FOMC' } },
          { title: { contains: 'Payrolls' } },
          { title: { contains: 'Retail Sales' } },
          { title: { contains: 'Building Permits' } },
          { title: { contains: 'Crude Oil' } },
          { title: { contains: 'Leading Index' } },
        ],
      },
    })
    console.log(
      `Cleared ${englishFrCleanup.count} leftover English-titled fr events`,
    )
  }

  for (const [, langEvents] of byLang) {
    const stored = await Promise.all(
      langEvents.map(async (event) => {
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

    storedCount += stored.filter(Boolean).length
  }

  return storedCount
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
      const storedCount = await replaceEventsInWindow(events)

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
