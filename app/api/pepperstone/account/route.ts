import { NextRequest, NextResponse } from 'next/server'
import { createPepperstoneClient } from '@/lib/pepperstone'

/**
 * GET /api/pepperstone/account - Get Pepperstone account summary via FIX
 */
export async function GET(req: NextRequest) {
  const client = createPepperstoneClient()
  
  try {
    // Connect to FIX server
    await client.connect()

    // Get account details
    const account = await client.getAccount()

    return NextResponse.json({
      success: true,
      account: {
        accountId: account.accountId,
        currency: account.currency,
        balance: account.balance,
        equity: account.equity,
        margin: account.margin,
        freeMargin: account.freeMargin,
        marginLevel: account.marginLevel,
        openPositions: account.openPositions,
      }
    })
  } catch (error) {
    console.error('Pepperstone account retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve account information', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    client.disconnect()
  }
}
