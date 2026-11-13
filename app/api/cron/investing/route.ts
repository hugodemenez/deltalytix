import { handlePrivateSchedule } from '@/lib/cron/handle-private-schedule'
import { prisma } from '@/lib/prisma'
import {
  fetchInvestingEvents,
  type CronLang,
  type MappedFinancialEvent,
} from '@/lib/investing-calendar'
import { upsertFinancialEvents } from '@/lib/financial-events-store'

/**
 * Weekly financial-events sync from Investing.com.
 *
 * Investing's calendar widget (sslecal2.investing.com) is Cloudflare-protected
 * from datacenter IPs, so the cron fetches it through Jina Reader and parses
 * the returned markdown. Optional JINA_API_KEY raises rate limits.
 *
 * Private Vercel Schedule (`investing`). Always persists to the deployment's
 * database, matching the former `/api/cron/investing?db=true` cron.
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

async function runInvestingCalendarSync() {
  const langs: CronLang[] = ['en', 'fr']
  console.log(
    `Fetching Investing.com calendars via Jina for langs=${langs.join(',')}`,
  )
  const { events } = await fetchInvestingEvents(langs)
  if (events.length === 0) {
    throw new Error('No Investing.com events found')
  }
  console.log(`Storing ${events.length} Investing.com events...`)
  const storedCount = await replaceEventsInWindow(events)
  console.info(
    `[schedule investing] stored ${storedCount} rows from ${events.length} events`,
  )
}

export const POST = handlePrivateSchedule(async () => {
  await runInvestingCalendarSync()
})
