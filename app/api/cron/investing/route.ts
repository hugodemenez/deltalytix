import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  fetchInvestingEvents,
  type CronLang,
  type MappedFinancialEvent,
} from '@/lib/investing-calendar'
import { backfillForexFactoryEvents } from '@/lib/forex-factory-calendar'
import { upsertFinancialEvents } from '@/lib/financial-events-store'

/**
 * Weekly financial-events sync from Investing.com.
 *
 * Investing's calendar widget (sslecal2.investing.com) is Cloudflare-protected
 * from datacenter IPs, so the cron fetches it through Jina Reader and parses
 * the returned markdown. Optional JINA_API_KEY raises rate limits.
 *
 * Gap backfill (Forex Factory historical weeks via Jina):
 *   /api/cron/investing?backfillFrom=2026-05-08&db=true
 * Optional: &backfillTo=2026-07-19
 *
 * Not CRON_SECRET-gated today (unlike other cron handlers). Vercel only
 * schedules crons on production; the HTTP endpoint can still be invoked on
 * preview for verification.
 */
export const maxDuration = 300

function parseIsoDateParam(value: string, label: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    throw new Error(`${label} must be YYYY-MM-DD`)
  }
  return new Date(
    Date.UTC(
      parseInt(match[1], 10),
      parseInt(match[2], 10) - 1,
      parseInt(match[3], 10),
    ),
  )
}

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

  return upsertFinancialEvents(events)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const langParam = searchParams.get('lang')
    const shouldStoreInDb = searchParams.get('db') === 'true'
    const debug = searchParams.get('debug') === '1'
    const backfillFromParam = searchParams.get('backfillFrom')

    const langs: CronLang[] =
      langParam === 'en' || langParam === 'fr' ? [langParam] : ['en', 'fr']

    // Historical gap fill from Forex Factory (does not wipe Investing rows).
    if (backfillFromParam) {
      const from = parseIsoDateParam(backfillFromParam, 'backfillFrom')
      const to = searchParams.get('backfillTo')
        ? parseIsoDateParam(searchParams.get('backfillTo')!, 'backfillTo')
        : new Date()

      console.log(
        `Backfilling Forex Factory calendars via Jina from=${from.toISOString().slice(0, 10)} to=${to.toISOString().slice(0, 10)} langs=${langs.join(',')}`,
      )

      const { events, diagnostics } = await backfillForexFactoryEvents({
        from,
        to,
        langs,
      })

      if (events.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No Forex Factory events found for backfill range',
            source: 'forex-factory',
            langs,
            ...(debug ? { diagnostics } : {}),
          },
          { status: 404 },
        )
      }

      if (shouldStoreInDb) {
        const storedCount = await upsertFinancialEvents(events)
        return NextResponse.json({
          success: true,
          source: 'forex-factory',
          mode: 'backfill',
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
        source: 'forex-factory',
        mode: 'backfill',
        langs,
        events,
        count: events.length,
        ...(debug ? { diagnostics } : {}),
      })
    }

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
        error: 'Failed to fetch financial calendar events',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
