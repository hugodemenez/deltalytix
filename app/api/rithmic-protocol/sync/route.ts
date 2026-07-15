import { NextRequest, NextResponse } from 'next/server'
import {
  getRithmicProtocolToken,
  getRithmicProtocolTrades,
} from '@/app/[locale]/dashboard/components/import/rithmic-protocol/sync/actions'

export const maxDuration = 300
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const accountId = body?.accountId as string | undefined

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: 'ACCOUNT_ID_REQUIRED' },
        { status: 400 },
      )
    }

    const tokenResult = await getRithmicProtocolToken(accountId)
    if (tokenResult.error || !tokenResult.storedTokenJson) {
      return NextResponse.json(
        {
          success: false,
          message: tokenResult.error || 'NO_TOKEN_RECONNECT',
        },
        { status: 400 },
      )
    }

    const syncResult = await getRithmicProtocolTrades(tokenResult.storedTokenJson)
    if (syncResult.error) {
      return NextResponse.json(
        {
          success: false,
          message: syncResult.error,
          errorParams: syncResult.errorParams,
          syncStats: syncResult.syncStats,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      savedCount: syncResult.savedCount ?? 0,
      tradesCount: syncResult.tradesCount ?? 0,
      syncStats: syncResult.syncStats,
      message: 'Sync completed',
    })
  } catch (error) {
    console.error('Error performing Rithmic Protocol sync:', error)
    return NextResponse.json(
      { success: false, message: 'SYNC_FAILED' },
      { status: 500 },
    )
  }
}
