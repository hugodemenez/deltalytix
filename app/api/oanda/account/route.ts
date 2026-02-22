import { NextRequest, NextResponse } from 'next/server'
import { createOANDAClient } from '@/lib/oanda'

/**
 * GET /api/oanda/account - Get OANDA account summary
 */
export async function GET(req: NextRequest) {
  try {
    const client = createOANDAClient()

    // Verify connection first
    const isConnected = await client.verifyConnection()
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Failed to connect to OANDA API' },
        { status: 401 }
      )
    }

    // Get account details
    const account = await client.getAccount()

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        alias: account.alias,
        currency: account.currency,
        balance: parseFloat(account.balance),
        unrealizedPL: parseFloat(account.unrealizedPL),
        marginUsed: parseFloat(account.marginUsed),
        marginAvailable: parseFloat(account.marginAvailable),
        openTradeCount: account.openTradeCount,
        openPositionCount: account.openPositionCount,
      }
    })
  } catch (error) {
    console.error('OANDA account retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve account information' },
      { status: 500 }
    )
  }
}
