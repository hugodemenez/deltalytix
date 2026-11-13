'use server'

import type { FinancialEvent } from '@/prisma/generated/prisma/client'
import {
  parseFinancialEventRange,
  type FinancialEventDateWindow,
} from '@/lib/financial-events/date-window'
import { findFinancialEvents } from '@/lib/financial-events/query'

function resolveWindow(
  range: { from: string | Date; to: string | Date } | undefined,
): FinancialEventDateWindow | null {
  return parseFinancialEventRange(range)
}

/**
 * Financial events for `locale` inside `range`.
 * Without a range, the read is the dashboard window around now — never the full table.
 * Invalid or inverted bounds return no rows, same as filtering them out in memory.
 * Ordered by date descending.
 */
export async function getFinancialEvents(
  locale: string | undefined = undefined,
  range?: { from: string | Date; to: string | Date },
): Promise<FinancialEvent[]> {
  try {
    const window = resolveWindow(range)
    if (!window) return []
    return await findFinancialEvents({
      lang: locale,
      window,
      orderByDateDesc: true,
    })
  } catch (error) {
    console.error('Error fetching financial events:', error)
    return []
  }
}

/**
 * Same date window as {@link getFinancialEvents}, but a database error rejects
 * so the client can retry instead of treating the month as empty.
 */
export async function getFinancialEventsInRange(
  locale: string,
  fromIso: string,
  toIso: string,
): Promise<FinancialEvent[]> {
  const window = resolveWindow({ from: fromIso, to: toIso })
  if (!window) return []
  return findFinancialEvents({
    lang: locale,
    window,
    orderByDateDesc: true,
  })
}
