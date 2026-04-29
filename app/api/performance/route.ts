import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'
import { computeWinRateData, computeDrawdown, computePeriodStats, type RawTrade } from '@/lib/performance/calculations'
import { resolveDateRange } from '@/lib/performance/date-utils'
import type { PeriodRange, PerformanceData, MaeMfeData } from '@/lib/performance/types'

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse period from query string ────────────────────────────────────────
  const sp = req.nextUrl.searchParams
  const period: PeriodRange = {
    type:   (sp.get('type') as PeriodRange['type']) ?? 'month',
    offset: Number(sp.get('offset') ?? '0'),
    from:   sp.get('from') ?? undefined,
    to:     sp.get('to') ?? undefined,
  }
  const { from, to } = resolveDateRange(period)

  // ── Fetch user's account numbers ──────────────────────────────────────────
  const dbUser = await prisma.user.findUnique({
    where:  { auth_user_id: user.id },
    select: { id: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const accounts = await prisma.account.findMany({
    where:  { userId: dbUser.id },
    select: { number: true },
  })
  const accountNumbers = accounts.map(a => a.number)

  // ── Fetch trades in range ─────────────────────────────────────────────────
  const trades = await prisma.trade.findMany({
    where: {
      accountNumber: { in: accountNumbers },
      entryDate: {
        gte: from.toISOString(),
        lte: to.toISOString(),
      },
    },
    select: {
      id: true,
      instrument: true,
      entryDate: true,
      closeDate: true,
      pnl: true,
      commission: true,
      side: true,
      timeInPosition: true,
    },
  })

  const raw: RawTrade[] = trades.map(t => ({
    id:             t.id,
    instrument:     t.instrument,
    entryDate:      t.entryDate,
    closeDate:      t.closeDate,
    pnl:            t.pnl,
    commission:     t.commission,
    side:           t.side ?? '',
    timeInPosition: t.timeInPosition,
  }))

  // ── Compute sections ──────────────────────────────────────────────────────
  const winRate  = computeWinRateData(raw)
  const drawdown = computeDrawdown(raw)
  const summary  = computePeriodStats('Current', raw)

  // ── MAE/MFE: join with TradeAnalytics ─────────────────────────────────────
  const tradeIds = raw.map(t => t.id)
  const analytics = await prisma.tradeAnalytics.findMany({
    where: { tradeId: { in: tradeIds } },
    select: { tradeId: true, mae: true, mfe: true, efficiency: true, riskRewardRatio: true },
  })
  const analyticsMap = new Map(analytics.map(a => [a.tradeId, a]))

  const maeMfePoints = raw
    .filter(t => analyticsMap.has(t.id))
    .map(t => {
      const a = analyticsMap.get(t.id)!
      return {
        tradeId:          t.id,
        instrument:       t.instrument,
        entryDate:        t.entryDate,
        pnl:              t.pnl - t.commission,
        mae:              a.mae,
        mfe:              a.mfe,
        efficiency:       a.efficiency ?? 0,
        riskRewardRatio:  a.riskRewardRatio ?? 0,
      }
    })

  const maeMfe: MaeMfeData = {
    points:        maeMfePoints,
    avgMae:        maeMfePoints.length ? maeMfePoints.reduce((s, p) => s + p.mae, 0) / maeMfePoints.length : 0,
    avgMfe:        maeMfePoints.length ? maeMfePoints.reduce((s, p) => s + p.mfe, 0) / maeMfePoints.length : 0,
    avgEfficiency: maeMfePoints.length ? maeMfePoints.reduce((s, p) => s + p.efficiency, 0) / maeMfePoints.length : 0,
    avgRR:         maeMfePoints.length ? maeMfePoints.reduce((s, p) => s + p.riskRewardRatio, 0) / maeMfePoints.length : 0,
  }

  const response: PerformanceData = { period, winRate, maeMfe, drawdown, summary }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'private, max-age=60' },
  })
}
