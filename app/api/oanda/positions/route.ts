import { NextRequest, NextResponse } from 'next/server'
import { createOANDAClient } from '@/lib/oanda'

/**
 * GET /api/oanda/positions - Get all open positions from OANDA
 */
export async function GET(req: NextRequest) {
  try {
    const client = createOANDAClient()
    const positions = await client.getPositions()

    return NextResponse.json({
      success: true,
      positions: positions.map(pos => ({
        instrument: pos.instrument,
        longUnits: parseFloat(pos.long.units),
        longAveragePrice: parseFloat(pos.long.averagePrice),
        longRealizedPL: parseFloat(pos.long.realizedPL),
        longUnrealizedPL: parseFloat(pos.long.unrealizedPL),
        shortUnits: parseFloat(pos.short.units),
        shortAveragePrice: parseFloat(pos.short.averagePrice),
        shortRealizedPL: parseFloat(pos.short.realizedPL),
        shortUnrealizedPL: parseFloat(pos.short.unrealizedPL),
      }))
    })
  } catch (error) {
    console.error('OANDA positions retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve positions' },
      { status: 500 }
    )
  }
}
