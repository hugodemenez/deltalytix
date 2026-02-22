import { NextRequest, NextResponse } from 'next/server'
import {
  getDxFeedToken,
  getDxFeedTrades,
} from '@/app/[locale]/dashboard/components/import/dxfeed/sync/actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const accountId = body?.accountId as string | undefined

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: 'accountId is required' },
        { status: 400 },
      )
    }

    const tokenResult = await getDxFeedToken(accountId)
    if (tokenResult.error || !tokenResult.storedTokenJson) {
      return NextResponse.json(
        {
          success: false,
          message: tokenResult.error || 'Missing DxFeed credentials',
        },
        { status: 400 },
      )
    }

    const syncResult = await getDxFeedTrades(tokenResult.storedTokenJson)
    if (syncResult.error) {
      return NextResponse.json(
        { success: false, message: syncResult.error },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      savedCount: syncResult.savedCount ?? 0,
      tradesCount: syncResult.tradesCount ?? 0,
      message: 'Sync completed',
    })
  } catch (error) {
    console.error('Error performing DxFeed sync:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to perform DxFeed sync' },
      { status: 500 },
    )
  }
}
