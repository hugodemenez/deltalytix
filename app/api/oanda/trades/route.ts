import { NextRequest, NextResponse } from 'next/server'
import { createOANDAClient } from '@/lib/oanda'

/**
 * GET /api/oanda/trades - Get trades from OANDA
 * Query params:
 * - state: 'open' | 'closed' | 'all' (default: 'open')
 * - limit: number (default: 500, max: 500)
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const state = searchParams.get('state') || 'open'
    const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 500)

    const client = createOANDAClient()
    let trades = []

    if (state === 'open' || state === 'all') {
      const openTrades = await client.getOpenTrades()
      trades = trades.concat(openTrades.map(t => ({ ...t, state: 'OPEN' })))
    }

    if (state === 'closed' || state === 'all') {
      const closedTrades = await client.getClosedTrades(limit)
      trades = trades.concat(closedTrades.map(t => ({ ...t, state: 'CLOSED' })))
    }

    return NextResponse.json({
      success: true,
      count: trades.length,
      trades: trades.map(trade => ({
        id: trade.id,
        instrument: trade.instrument,
        state: trade.state,
        units: parseFloat(trade.currentUnits || '0'),
        openTime: new Date(parseInt(trade.openTime) * 1000).toISOString(),
        averagePrice: parseFloat(trade.averagePrice || '0'),
        realizedPL: parseFloat(trade.realizedPL || '0'),
        unrealizedPL: parseFloat(trade.unrealizedPL || '0'),
        initialUnits: parseFloat(trade.initialUnits || '0'),
        financing: parseFloat(trade.financing || '0'),
        closeTime: trade.closeTime ? new Date(parseInt(trade.closeTime) * 1000).toISOString() : null,
      }))
    })
  } catch (error) {
    console.error('OANDA trades retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve trades' },
      { status: 500 }
    )
  }
}
