import { NextRequest, NextResponse } from 'next/server'
import { createPepperstoneClient } from '@/lib/pepperstone'

/**
 * GET /api/pepperstone/trades - Get trades from Pepperstone via FIX
 */
export async function GET(req: NextRequest) {
  const client = createPepperstoneClient()
  
  try {
    await client.connect()
    const trades = await client.getTrades()

    return NextResponse.json({
      success: true,
      count: trades.length,
      trades: trades.map(trade => ({
        symbol: trade.symbol,
        type: trade.side,
        status: trade.status,
        volume: trade.quantity,
        openPrice: trade.openPrice,
        openTime: trade.openTime.toISOString(),
        closePrice: trade.closePrice || null,
        closeTime: trade.closeTime?.toISOString() || null,
        profit: trade.profit,
      }))
    })
  } catch (error) {
    console.error('Pepperstone trades retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve trades', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    client.disconnect()
  }
}
