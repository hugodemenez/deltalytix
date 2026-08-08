import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { buildTradeWhere, computeProfitFactor } from "@/lib/api/pagination"
import { calculateStatistics, calculateTradingDays } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import type { Trade } from "@/prisma/generated/prisma/client"

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request, ["metrics:read"])
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const where = buildTradeWhere(auth.auth.userId, {
    accountNumber: searchParams.get("accountNumber") || undefined,
    instrument: searchParams.get("instrument") || undefined,
    side: searchParams.get("side") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
  })

  const trades = (await prisma.trade.findMany({ where })) as Trade[]
  const stats = calculateStatistics(trades)
  const tradingDays = calculateTradingDays(trades)
  const profitFactor = computeProfitFactor(trades)

  const wins = trades.filter((t) => t.pnl - t.commission > 0)
  const losses = trades.filter((t) => t.pnl - t.commission < 0)
  const averageWin =
    wins.length > 0
      ? wins.reduce((sum, t) => sum + (t.pnl - t.commission), 0) / wins.length
      : 0
  const averageLoss =
    losses.length > 0
      ? Math.abs(
          losses.reduce((sum, t) => sum + (t.pnl - t.commission), 0) /
            losses.length,
        )
      : 0

  return NextResponse.json({
    totalPnl: stats.cumulativePnl,
    totalCommission: stats.cumulativeFees,
    tradeCount: stats.nbTrades,
    winCount: stats.nbWin,
    lossCount: stats.nbLoss,
    breakevenCount: stats.nbBe,
    winRate: stats.winRate,
    profitFactor: Number.isFinite(profitFactor) ? profitFactor : null,
    averageWin,
    averageLoss,
    longCount: trades.filter((t) => (t.side || "").toLowerCase() === "long").length,
    shortCount: trades.filter(
      (t) => (t.side || "").toLowerCase() === "short",
    ).length,
    tradingDays: tradingDays.totalTradingDays,
  })
}
