import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { computeMetricsForAccounts } from "@/lib/account-metrics"
import { prisma } from "@/lib/prisma"
import type { Account } from "@/context/data-provider"

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request, ["accounts:read"])
  if (!auth.ok) return auth.response

  const includeMetrics =
    new URL(request.url).searchParams.get("includeMetrics") === "true"

  const accounts = await prisma.account.findMany({
    where: { userId: auth.auth.userId },
    include: {
      payouts: {
        select: {
          id: true,
          amount: true,
          date: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  if (!includeMetrics) {
    return NextResponse.json({
      data: accounts.map((account) => ({
        id: account.id,
        number: account.number,
        propfirm: account.propfirm,
        startingBalance: account.startingBalance,
        createdAt: account.createdAt.toISOString(),
        payouts: account.payouts.map((p) => ({
          id: p.id,
          amount: p.amount,
          date: p.date.toISOString(),
          status: p.status,
        })),
      })),
    })
  }

  const trades = await prisma.trade.findMany({
    where: { userId: auth.auth.userId },
  })

  const withMetrics = computeMetricsForAccounts(
    accounts as unknown as Account[],
    trades,
  )

  return NextResponse.json({
    data: withMetrics.map((account) => ({
      id: account.id,
      number: account.number,
      propfirm: account.propfirm,
      startingBalance: account.startingBalance,
      createdAt: account.createdAt.toISOString(),
      balance: account.balanceToDate,
      drawdown: account.metrics?.drawdownProgress ?? null,
      consistency: account.metrics?.isConsistent ?? null,
      progress: account.metrics?.progress ?? null,
      metrics: account.metrics ?? null,
      payouts: (account.payouts || []).map((p) => ({
        id: p.id,
        amount: p.amount,
        date: new Date(p.date).toISOString(),
        status: p.status,
      })),
    })),
  })
}
