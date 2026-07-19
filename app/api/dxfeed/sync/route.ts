import { NextRequest, NextResponse } from 'next/server'
import {
  getDxFeedToken,
  getDxFeedTrades,
} from '@/app/[locale]/dashboard/components/import/dxfeed/sync/actions'
import { DxFeedErrorCode } from '@/lib/dxfeed-errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const accountId = body?.accountId as string | undefined

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: DxFeedErrorCode.ACCOUNT_ID_REQUIRED },
        { status: 400 },
      )
    }

    const tokenResult = await getDxFeedToken(accountId)
    if (tokenResult.error || !tokenResult.storedTokenJson) {
      return NextResponse.json(
        {
          success: false,
          message: tokenResult.error || DxFeedErrorCode.NO_TOKEN_RECONNECT,
        },
        { status: 400 },
      )
    }

    const syncResult = await getDxFeedTrades(tokenResult.storedTokenJson, {
      accountId,
    })
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
    console.error('Error performing DxFeed sync:', error)
    return NextResponse.json(
      { success: false, message: DxFeedErrorCode.SYNC_FAILED },
      { status: 500 },
    )
  }
}
