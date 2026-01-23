'use server'

import { prisma } from '@/lib/prisma'
import { cacheLife } from 'next/cache'
import type { PropfirmCatalogueData, PropfirmCatalogueStats, PropfirmPayoutStats } from './types'
import type { Timeframe } from './timeframe-utils'
import { getTimeframeDateRange } from './timeframe-utils'

// Raw SQL query result type for payout aggregation
interface PayoutAggregationResult {
  propfirm: string;
  status: string;
  total_amount: number;
  count: number;
}

// Raw SQL query result type for account count
interface AccountCountResult {
  propfirm: string;
  count: number;
}

export async function getPropfirmCatalogueData(timeframe: Timeframe = 'currentMonth'): Promise<PropfirmCatalogueData> {
  'use cache'
  cacheLife('weeks')

  try {
    const { startDate, endDate } = getTimeframeDateRange(timeframe)
    
    // Get account counts per propfirm (excluding empty propfirm strings)
    // Filter by createdAt within the timeframe
    const accountCounts = await prisma.$queryRaw<AccountCountResult[]>`
      SELECT 
        propfirm as propfirm,
        COUNT(*)::int as count
      FROM "Account"
      WHERE propfirm IS NOT NULL 
        AND propfirm != ''
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
      GROUP BY propfirm
      ORDER BY propfirm
    `

    // Get payout aggregations per propfirm and status
    // We need to join Payout -> Account to get the propfirm name
    // Filter payouts by date (payout date) within the timeframe
    const payoutAggregations = await prisma.$queryRaw<PayoutAggregationResult[]>`
      SELECT 
        a.propfirm as propfirm,
        p.status as status,
        COALESCE(SUM(p.amount), 0)::float as total_amount,
        COUNT(*)::int as count
      FROM "Payout" p
      INNER JOIN "Account" a ON p."accountId" = a.id
      WHERE a.propfirm IS NOT NULL 
        AND a.propfirm != ''
        AND p.date >= ${startDate}
        AND p.date <= ${endDate}
      GROUP BY a.propfirm, p.status
      ORDER BY a.propfirm, p.status
    `

    // Build a map of propfirm -> payout stats
    const payoutStatsMap = new Map<string, PropfirmPayoutStats>()

    // Initialize payout stats for all propfirms found in accounts
    accountCounts.forEach((row: AccountCountResult) => {
      const { propfirm } = row
      if (!payoutStatsMap.has(propfirm)) {
        payoutStatsMap.set(propfirm, {
          propfirmName: propfirm,
          pendingAmount: 0,
          pendingCount: 0,
          refusedAmount: 0,
          refusedCount: 0,
          paidAmount: 0,
          paidCount: 0,
        })
      }
    })

    // Aggregate payout data by status
    payoutAggregations.forEach((row: PayoutAggregationResult) => {
      const { propfirm, status, total_amount, count } = row
      if (!payoutStatsMap.has(propfirm)) {
        payoutStatsMap.set(propfirm, {
          propfirmName: propfirm,
          pendingAmount: 0,
          pendingCount: 0,
          refusedAmount: 0,
          refusedCount: 0,
          paidAmount: 0,
          paidCount: 0,
        })
      }

      const stats = payoutStatsMap.get(propfirm)!

      if (status === 'PENDING') {
        stats.pendingAmount = Number(total_amount)
        stats.pendingCount = count
      } else if (status === 'REFUSED') {
        stats.refusedAmount = Number(total_amount)
        stats.refusedCount = count
      } else if (status === 'PAID' || status === 'VALIDATED') {
        // Combine PAID and VALIDATED as "paid"
        stats.paidAmount += Number(total_amount)
        stats.paidCount += count
      }
    })

    // Build final stats array combining account counts and payout stats
    const stats: PropfirmCatalogueStats[] = accountCounts.map((row: AccountCountResult) => {
      const { propfirm, count } = row
      const payoutStats = payoutStatsMap.get(propfirm) || {
        propfirmName: propfirm,
        pendingAmount: 0,
        pendingCount: 0,
        refusedAmount: 0,
        refusedCount: 0,
        paidAmount: 0,
        paidCount: 0,
      }

      return {
        propfirmName: propfirm,
        accountsCount: count,
        payouts: payoutStats,
      }
    })

    // Also include propfirms that have payouts but no accounts (edge case)
    payoutStatsMap.forEach((payoutStats, propfirm) => {
      const exists = stats.some(s => s.propfirmName === propfirm)
      if (!exists) {
        stats.push({
          propfirmName: propfirm,
          accountsCount: 0,
          payouts: payoutStats,
        })
      }
    })

    return { stats }
  } catch (error) {
    console.error('Error fetching propfirm catalogue data:', error)
    // Return empty stats on error
    return { stats: [] }
  }
}

