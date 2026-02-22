import { NextRequest, NextResponse } from 'next/server'
import { createPepperstoneClient } from '@/lib/pepperstone'

/**
 * GET /api/pepperstone/positions - Get all open positions from Pepperstone via FIX
 */
export async function GET(req: NextRequest) {
  const client = createPepperstoneClient()
  
  try {
    await client.connect()
    const positions = await client.getPositions()

    return NextResponse.json({
      success: true,
      count: positions.length,
      positions: positions.map(pos => ({
        symbol: pos.symbol,
        type: pos.side,
        volume: pos.quantity,
        price: pos.averagePrice,
        profit: pos.unrealizedPL,
      }))
    })
  } catch (error) {
    console.error('Pepperstone positions retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve positions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    client.disconnect()
  }
}
