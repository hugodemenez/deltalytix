/**
 * One-shot Forex Factory historical backfill for FinancialEvent rows.
 *
 * Fetches weekly FF calendars via Jina Reader and upserts en/fr rows.
 * Does NOT delete existing Investing.com events (title+date unique upsert).
 *
 * Run:
 *   bun scripts/backfill-ff-calendar.ts
 *   bun scripts/backfill-ff-calendar.ts --from=2026-05-08 --to=2026-07-19
 *   bun scripts/backfill-ff-calendar.ts --dry-run
 */
import '@/lib/load-env-local.node'
import { backfillForexFactoryEvents } from '@/lib/forex-factory-calendar'
import { upsertFinancialEvents } from '@/lib/financial-events-store'
import { prisma } from '@/lib/prisma'

function parseArgs(argv: string[]) {
  const args = new Map<string, string>()
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value = 'true'] = arg.slice(2).split('=')
    args.set(key, value)
  }
  return args
}

function parseDate(value: string, label: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    throw new Error(`${label} must be YYYY-MM-DD, got ${value}`)
  }
  const date = new Date(
    Date.UTC(
      parseInt(match[1], 10),
      parseInt(match[2], 10) - 1,
      parseInt(match[3], 10),
    ),
  )
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} is not a valid date: ${value}`)
  }
  return date
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const from = parseDate(args.get('from') ?? '2026-05-08', '--from')
  const to = args.has('to')
    ? parseDate(args.get('to')!, '--to')
    : new Date()
  const dryRun = args.get('dry-run') === 'true'

  console.log(
    `[ff-backfill] from=${from.toISOString().slice(0, 10)} to=${to.toISOString().slice(0, 10)} dryRun=${dryRun}`,
  )

  const { events, diagnostics } = await backfillForexFactoryEvents({
    from,
    to,
    langs: ['en', 'fr'],
  })

  console.log('[ff-backfill] diagnostics:', JSON.stringify(diagnostics, null, 2))
  console.log(`[ff-backfill] fetched ${events.length} rows`)

  if (events.length === 0) {
    console.error('[ff-backfill] no events parsed; aborting')
    process.exitCode = 1
    return
  }

  if (dryRun) {
    console.log(
      '[ff-backfill] sample:',
      events.slice(0, 8).map((event) => ({
        title: event.title,
        date: event.date.toISOString(),
        importance: event.importance,
        lang: event.lang,
      })),
    )
    return
  }

  const storedCount = await upsertFinancialEvents(events)
  console.log(`[ff-backfill] upserted ${storedCount} rows`)

  const min = await prisma.financialEvent.findFirst({
    orderBy: { date: 'asc' },
    select: { date: true, title: true, lang: true },
  })
  const max = await prisma.financialEvent.findFirst({
    orderBy: { date: 'desc' },
    select: { date: true, title: true, lang: true },
  })
  const total = await prisma.financialEvent.count()
  console.log('[ff-backfill] db coverage:', { total, min, max })
}

main()
  .catch((error) => {
    console.error('[ff-backfill] failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
