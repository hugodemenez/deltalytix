import type { FinancialEvent } from "@/prisma/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import {
  financialEventWhere,
  type FinancialEventDateWindow,
} from "@/lib/financial-events/date-window"

export async function findFinancialEvents(params: {
  lang?: string
  window: FinancialEventDateWindow
  orderByDateDesc?: boolean
}): Promise<FinancialEvent[]> {
  return prisma.financialEvent.findMany({
    where: financialEventWhere(params.lang, params.window),
    ...(params.orderByDateDesc ? { orderBy: { date: "desc" as const } } : {}),
  })
}
