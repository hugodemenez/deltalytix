'use server'

import { PrismaClient, FinancialEvent } from '@/prisma/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  explicitFinancialEventWindow,
  financialEventWhere,
  type FinancialEventDateWindow,
} from '@/lib/financial-events/date-window'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

async function findFinancialEvents(
  locale: string | undefined,
  window: FinancialEventDateWindow,
  order: 'asc' | 'desc',
): Promise<FinancialEvent[]> {
  return prisma.financialEvent.findMany({
    where: financialEventWhere(locale, window),
    orderBy: { date: order },
  })
}

/**
 * Financial events for one language inside `window` (inclusive).
 * Callers pass the range the UI or tool will actually show.
 */
export async function getFinancialEvents(
  locale: string | undefined,
  window: FinancialEventDateWindow,
): Promise<FinancialEvent[]> {
  try {
    return await findFinancialEvents(locale, window, 'desc')
  } catch (error) {
    console.error('Error fetching financial events:', error)
    return []
  }
}

/**
 * Calendar month navigation and journal day changes. Bounds are inclusive ISO
 * timestamps. Database errors propagate so the client does not treat a failed
 * read as an empty range.
 */
export async function getFinancialEventsInWindow(
  locale: string,
  startIso: string,
  endIso: string,
): Promise<FinancialEvent[]> {
  const window = explicitFinancialEventWindow(startIso, endIso)
  if (!window || !locale) return []
  return findFinancialEvents(locale, window, 'asc')
}
