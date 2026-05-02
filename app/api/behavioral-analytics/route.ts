import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { PrismaClient } from '@/prisma/generated/prisma'
import {
  detectBehavioralPatterns,
  deduplicateDetections,
  type BehavioralTradeInput,
} from '@/lib/behavioral-analytics'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Params ────────────────────────────────────────────────────────────────
  const { searchParams } = req.nextUrl
  const accountNumber = searchParams.get('accountNumber')
  const limit = Math.min(Number(searchParams.get('limit') || '300'), 500)
  const fromParam = searchParams.get('from')   // ISO date string, e.g. 2025-01-01
  const toParam   = searchParams.get('to')     // ISO date string, e.g. 2025-12-31

  // Parse date range — closeDate is stored as a String in the Trade model,
  // so we filter in-memory after fetching (consistent with the rest of the app).
  const fromDate = fromParam ? new Date(fromParam) : null
  const toDate   = toParam   ? new Date(toParam)   : null

  // ── Fetch trades for the authenticated user ───────────────────────────────
  const trades = await prisma.trade.findMany({
    where: {
      userId: user.id,
      ...(accountNumber ? { accountNumber } : {}),
    },
    orderBy: { closeDate: 'asc' },
    take: limit,
    select: {
      id:            true,
      instrument:    true,
      pnl:           true,
      entryDate:     true,
      closeDate:     true,
      quantity:      true,
      entryPrice:    true,
      closePrice:    true,
      side:          true,
      accountNumber: true,
      tags:          true,
    },
  })

  // ── Date-range filter (in-memory) ────────────────────────────────────────
  const filtered = trades.filter((t) => {
    const d = new Date(t.closeDate)
    if (fromDate && d < fromDate) return false
    if (toDate   && d > toDate)   return false
    return true
  })

  // ── Normalize ─────────────────────────────────────────────────────────────
  const normalized: BehavioralTradeInput[] = filtered.map((trade) => ({
    ...trade,
    entryPrice: Number(trade.entryPrice),
    closePrice: Number(trade.closePrice),
  }))

  // ── Detect + deduplicate ──────────────────────────────────────────────────
  const raw         = detectBehavioralPatterns(normalized)
  const detections  = deduplicateDetections(raw)

  // ── Summary ───────────────────────────────────────────────────────────────
  const totals = detections.reduce(
    (acc, item) => {
      acc.count        += 1
      acc.estimatedLoss += item.estimatedLoss
      return acc
    },
    { count: 0, estimatedLoss: 0 }
  )

  return NextResponse.json({
    detections,
    summary: {
      ...totals,
      byType: detections.reduce<Record<string, number>>((acc, item) => {
        acc[item.type] = (acc[item.type] ?? 0) + 1
        return acc
      }, {}),
    },
    meta: {
      total:    trades.length,
      filtered: filtered.length,
      from:     fromParam ?? null,
      to:       toParam   ?? null,
    },
  })
}
