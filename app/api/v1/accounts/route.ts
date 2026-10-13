import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { computeMetricsForAccounts } from "@/lib/account-metrics"
import { HIDDEN_GROUP_NAME } from "@/lib/account-groups"
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
      group: { select: { id: true, name: true } },
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

  // Hiding an account in the dashboard moves it into the "Hidden Accounts"
  // group; expose both so clients can skip hidden accounts or show groups.
  const groupFields = new Map(
    accounts.map((account) => [
      account.id,
      {
        hidden: account.group?.name === HIDDEN_GROUP_NAME,
        group: account.group
          ? { id: account.group.id, name: account.group.name }
          : null,
      },
    ]),
  )

  if (!includeMetrics) {
    return NextResponse.json({
      data: accounts.map((account) => ({
        id: account.id,
        number: account.number,
        propfirm: account.propfirm,
        startingBalance: account.startingBalance,
        createdAt: account.createdAt.toISOString(),
        ...groupFields.get(account.id),
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
      ...groupFields.get(account.id),
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
