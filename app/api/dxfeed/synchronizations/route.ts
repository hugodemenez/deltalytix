import { NextRequest, NextResponse } from 'next/server'
import {
  getDxFeedSynchronizations,
  removeDxFeedToken,
} from '@/app/[locale]/dashboard/components/import/dxfeed/sync/actions'

export async function GET() {
  try {
    const result = await getDxFeedSynchronizations()
    if (result.error) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 },
      )
    }

    const sanitized = (result.synchronizations || []).map(({ token, ...rest }) => {
      let accountNumbers: string[] = []
      if (token) {
        try {
          const parsed = JSON.parse(token)
          if (Array.isArray(parsed.accountNumbers)) {
            accountNumbers = parsed.accountNumbers
          }
        } catch { /* ignore parse errors */ }
      }
      return {
        ...rest,
        hasToken: !!token,
        accountNumbers,
      }
    })

    return NextResponse.json({
      success: true,
      data: sanitized,
    })
  } catch (error) {
    console.error('Error fetching DxFeed synchronizations:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch DxFeed synchronizations' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const accountId = body?.accountId as string | undefined

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: 'accountId is required' },
        { status: 400 },
      )
    }

    const result = await removeDxFeedToken(accountId)
    if (result.error) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Synchronization removed',
    })
  } catch (error) {
    console.error('Error deleting DxFeed synchronization:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete synchronization' },
      { status: 500 },
    )
  }
}
