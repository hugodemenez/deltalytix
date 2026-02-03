"use server";

import { createClient } from "./auth";
import { prisma } from "@/lib/prisma";
import {
  computeEquityChartData,
  type EquityChartParams,
  type EquityChartResult,
} from "@/lib/equity-chart";

export type { EquityChartParams, EquityChartResult } from "@/lib/equity-chart";

export async function getEquityChartDataAction(
  params: EquityChartParams
): Promise<EquityChartResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  try {
    const [trades, accounts, groups] = await prisma.$transaction([
      prisma.trade.findMany({
        where: { userId: user.id },
        orderBy: { entryDate: "desc" },
      }),
      prisma.account.findMany({
        where: { userId: user.id },
        include: { payouts: true },
      }),
      prisma.group.findMany({
        where: { userId: user.id },
        include: { accounts: true },
      }),
    ]);

    return computeEquityChartData(
      trades.map((t) => ({
        entryDate: t.entryDate,
        accountNumber: t.accountNumber,
        instrument: t.instrument,
        pnl: t.pnl,
        commission: t.commission,
        timeInPosition: t.timeInPosition,
        tags: t.tags,
      })),
      accounts.map((a) => ({
        number: a.number,
        groupId: a.groupId,
        startingBalance: a.startingBalance,
        resetDate: a.resetDate,
        payouts: (a.payouts ?? []).map((p) => ({
          date: p.date,
          amount: p.amount,
          status: p.status,
        })),
      })),
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        accounts: (g.accounts ?? []).map((a) => ({ number: a.number })),
      })),
      params
    );
  } catch (error) {
    console.error("[getEquityChartData] Error:", error);
    throw new Error("Failed to fetch equity chart data");
  }
}
