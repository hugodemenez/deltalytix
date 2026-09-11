import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { computeMetricsForAccounts } from "@/lib/account-metrics"
import { prisma } from "@/lib/prisma"
import type { Account } from "@/context/data-provider"

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request, ["metrics:read"])
  if (!auth.ok) return auth.response

  const [accounts, trades] = await Promise.all([
    prisma.account.findMany({
      where: { userId: auth.auth.userId },
      include: { payouts: true },
    }),
    prisma.trade.findMany({ where: { userId: auth.auth.userId } }),
  ])

  const withMetrics = computeMetricsForAccounts(
    accounts as unknown as Account[],
    trades,
  )

  return NextResponse.json({
    data: withMetrics.map((account) => ({
      id: account.id,
      number: account.number,
      balance: account.balanceToDate,
      drawdown: account.metrics?.drawdownProgress ?? null,
      consistency: account.metrics?.isConsistent ?? null,
      progress: account.metrics?.progress ?? null,
      metrics: account.metrics ?? null,
    })),
  })
}
