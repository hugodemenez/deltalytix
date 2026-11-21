'use server'

import {
  explicitFinancialEventWindow,
} from '@/lib/financial-events/date-window'
import { loadFinancialEvents } from '@/lib/financial-events/load'
import type { FinancialEvent } from '@/prisma/generated/prisma/client'
import { getUserId } from '@/server/auth'

/**
 * Calendar month navigation and journal day changes. This file is a server
 * action, so the function is client-callable: require a signed-in user and
 * refuse windows wider than the UI cap. Bounds are inclusive ISO timestamps.
 * Database errors and over-wide windows throw so the client does not treat a
 * failed read as an empty range.
 */
export async function getFinancialEventsInWindow(
  locale: string,
  startIso: string,
  endIso: string,
): Promise<FinancialEvent[]> {
  await getUserId()
  const window = explicitFinancialEventWindow(startIso, endIso)
  if (!window || !locale) return []
  return loadFinancialEvents(locale, window, 'asc')
}
