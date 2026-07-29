import { prisma } from '@/lib/prisma'
import type {
  CronLang,
  MappedFinancialEvent,
} from '@/lib/investing-calendar'

/**
 * Upsert financial events without deleting the surrounding date window.
 * Safe for gap backfills that must not wipe Investing.com rows.
 */
export async function upsertFinancialEvents(
  events: MappedFinancialEvent[],
): Promise<number> {
  const byLang = new Map<CronLang, MappedFinancialEvent[]>()
  for (const event of events) {
    const list = byLang.get(event.lang) ?? []
    list.push(event)
    byLang.set(event.lang, list)
  }

  let storedCount = 0

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
          console.error(`Error upserting event ${event.title}:`, error)
          return null
        }
      }),
    )

    storedCount += stored.filter(Boolean).length
  }

  return storedCount
}
