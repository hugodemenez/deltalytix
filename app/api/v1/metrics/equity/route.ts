import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { computeEquityChartData } from "@/lib/equity-chart"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request, ["metrics:read"])
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from") || undefined
  const to = searchParams.get("to") || undefined
  const accountNumbersParam = searchParams.get("accountNumbers")
  const accountNumbers = accountNumbersParam
    ? accountNumbersParam.split(",").map((s) => s.trim()).filter(Boolean)
    : []
  const showIndividual = searchParams.get("showIndividual") === "true"

  const [allTrades, accounts, groups] = await Promise.all([
    prisma.trade.findMany({ where: { userId: auth.auth.userId } }),
    prisma.account.findMany({
      where: { userId: auth.auth.userId },
      include: { payouts: true },
    }),
    prisma.group.findMany({
      where: { userId: auth.auth.userId },
      include: { accounts: { select: { number: true } } },
    }),
  ])

  // computeEquityChartData only applies its date-range filter in
  // per-account mode (the dashboard pre-filters trades in grouped mode),
  // so the API pre-filters here to honor from/to in both modes.
  const fromDate = from ? new Date(from) : null
  const toDate = to ? new Date(to) : null
  if (toDate) toDate.setUTCHours(23, 59, 59, 999)
  const trades =
    fromDate || toDate
      ? allTrades.filter((trade) => {
          const entryDate = new Date(trade.entryDate)
          if (Number.isNaN(entryDate.getTime())) return false
          if (fromDate && entryDate < fromDate) return false
          if (toDate && entryDate > toDate) return false
          return true
        })
      : allTrades

  const result = computeEquityChartData(
    trades,
    accounts.map((a) => ({
      number: a.number,
      groupId: a.groupId,
      startingBalance: a.startingBalance,
      resetDate: a.resetDate,
      payouts: a.payouts.map((p) => ({
        date: p.date,
        amount: p.amount,
        status: p.status,
      })),
    })),
    groups.map((g) => ({
      id: g.id,
      name: g.name,
      accounts: g.accounts,
    })),
    {
      instruments: [],
      accountNumbers,
      dateRange: from || to ? { from: from || "", to: to || "" } : undefined,
      pnlRange: {},
      tickRange: {},
      timeRange: { range: null },
      tickFilter: { value: null },
      weekdayFilter: { days: [] },
      hourFilter: { hour: null },
      tagFilter: { tags: [] },
      timezone: "UTC",
      showIndividual,
      maxAccounts: 8,
      dataSampling: "all",
      selectedAccounts: accountNumbers,
    },
  )

  return NextResponse.json({
    data: result.chartData,
    accountNumbers: result.accountNumbers,
    dateRange: result.dateRange,
  })
}
