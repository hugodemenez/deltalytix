import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/prisma/generated/prisma'
import { detectBehavioralPatterns, type BehavioralTradeInput } from '@/lib/behavioral-analytics'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const userId = searchParams.get('userId')
  const accountNumber = searchParams.get('accountNumber')
  const limit = Number(searchParams.get('limit') || '200')

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const trades = await prisma.trade.findMany({
    where: {
      userId,
      ...(accountNumber ? { accountNumber } : {}),
    },
    orderBy: { closeDate: 'asc' },
    take: Math.min(limit, 500),
    select: {
      id: true,
      instrument: true,
      pnl: true,
      entryDate: true,
      closeDate: true,
      quantity: true,
      entryPrice: true,
      closePrice: true,
      side: true,
      accountNumber: true,
      tags: true,
    },
  })

  const normalized: BehavioralTradeInput[] = trades.map((trade) => ({
    ...trade,
    entryPrice: Number(trade.entryPrice),
    closePrice: Number(trade.closePrice),
  }))

  const detections = detectBehavioralPatterns(normalized)

  const totals = detections.reduce(
    (acc, item) => {
      acc.count += 1
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
  })
}
