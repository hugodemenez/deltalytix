import { prisma } from "@/lib/prisma"
import type { FinancialEvent } from "@/prisma/generated/prisma/client"
import {
  assertFinancialEventWindow,
  financialEventWhere,
  type FinancialEventDateWindow,
} from "@/lib/financial-events/date-window"

/**
 * Shared-client read. Every caller must already be authenticated or be a
 * server job. The span cap runs before the query so a 1900–2200 window cannot
 * scan the language partition.
 */
export async function loadFinancialEvents(
  locale: string | undefined,
  window: FinancialEventDateWindow,
  order: "asc" | "desc",
): Promise<FinancialEvent[]> {
  assertFinancialEventWindow(window)
  return prisma.financialEvent.findMany({
    where: financialEventWhere(locale, window),
    orderBy: { date: order },
  })
}
