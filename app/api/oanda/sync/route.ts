import { NextRequest, NextResponse } from 'next/server'
import { createOANDAClient } from '@/lib/oanda'

/**
 * POST /api/oanda/sync - Synchronize OANDA data
 * Fetches all account data, open positions, and recent trades
 */
export async function POST(req: NextRequest) {
  try {
    const client = createOANDAClient()

    // Verify connection
    const isConnected = await client.verifyConnection()
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Failed to connect to OANDA API' },
        { status: 401 }
      )
    }

    // Fetch all data in parallel
    const [account, positions, openTrades, closedTrades] = await Promise.all([
      client.getAccount(),
      client.getPositions(),
      client.getOpenTrades(),
      client.getClosedTrades(500),
    ])

    const syncData = {
      timestamp: new Date().toISOString(),
      account: {
        id: account.id,
        alias: account.alias,
        currency: account.currency,
        balance: parseFloat(account.balance),
        unrealizedPL: parseFloat(account.unrealizedPL),
        marginUsed: parseFloat(account.marginUsed),
        marginAvailable: parseFloat(account.marginAvailable),
        marginRate: parseFloat(account.marginRate),
        openTradeCount: account.openTradeCount,
        openPositionCount: account.openPositionCount,
      },
      positions: positions.map(pos => ({
        instrument: pos.instrument,
        netUnits: parseFloat(pos.long.units) + parseFloat(pos.short.units),
        longUnits: parseFloat(pos.long.units),
        longAveragePrice: parseFloat(pos.long.averagePrice),
        longRealizedPL: parseFloat(pos.long.realizedPL),
        longUnrealizedPL: parseFloat(pos.long.unrealizedPL),
        shortUnits: parseFloat(pos.short.units),
        shortAveragePrice: parseFloat(pos.short.averagePrice),
        shortRealizedPL: parseFloat(pos.short.realizedPL),
        shortUnrealizedPL: parseFloat(pos.short.unrealizedPL),
        totalRealizedPL: parseFloat(pos.long.realizedPL) + parseFloat(pos.short.realizedPL),
        totalUnrealizedPL: parseFloat(pos.long.unrealizedPL) + parseFloat(pos.short.unrealizedPL),
      })),
      trades: {
        open: openTrades.length,
        closed: closedTrades.length,
        total: openTrades.length + closedTrades.length,
      }
    }

    return NextResponse.json({
      success: true,
      data: syncData,
      summary: {
        accountBalance: syncData.account.balance,
        unrealizedPL: syncData.account.unrealizedPL,
        marginUsed: syncData.account.marginUsed,
        openPositions: syncData.account.openPositionCount,
        openTrades: syncData.account.openTradeCount,
      }
    })
  } catch (error) {
    console.error('OANDA sync error:', error)
    return NextResponse.json(
      { error: 'Failed to synchronize OANDA data' },
      { status: 500 }
    )
  }
}
