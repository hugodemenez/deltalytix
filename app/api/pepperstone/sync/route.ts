import { NextRequest, NextResponse } from 'next/server'
import { createPepperstoneClient } from '@/lib/pepperstone'

/**
 * POST /api/pepperstone/sync - Synchronize Pepperstone data via FIX
 */
export async function POST(req: NextRequest) {
  const client = createPepperstoneClient()
  
  try {
    // Connect to FIX server
    await client.connect()

    // Fetch all data in parallel
    const [account, positions, trades] = await Promise.all([
      client.getAccount(),
      client.getPositions(),
      client.getTrades(),
    ])

    const syncData = {
      timestamp: new Date().toISOString(),
      account: {
        accountId: account.accountId,
        currency: account.currency,
        balance: account.balance,
        equity: account.equity,
        margin: account.margin,
        freeMargin: account.freeMargin,
        marginLevel: account.marginLevel,
        openPositions: account.openPositions,
      },
      positions: positions.map(pos => ({
        symbol: pos.symbol,
        side: pos.side,
        quantity: pos.quantity,
        averagePrice: pos.averagePrice,
        unrealizedPL: pos.unrealizedPL,
      })),
      trades: {
        open: trades.filter(t => t.status === 'OPEN').length,
        closed: trades.filter(t => t.status === 'CLOSED').length,
        total: trades.length,
      }
    }

    return NextResponse.json({
      success: true,
      data: syncData,
      summary: {
        accountBalance: syncData.account.balance,
        equity: syncData.account.equity,
        freeMargin: syncData.account.freeMargin,
        marginUsed: syncData.account.margin,
        openPositions: syncData.account.openPositions,
        openTrades: syncData.trades.open,
      }
    })
  } catch (error) {
    console.error('Pepperstone sync error:', error)
    return NextResponse.json(
      { error: 'Failed to synchronize Pepperstone data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    client.disconnect()
  }
}
