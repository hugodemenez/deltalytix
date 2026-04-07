import { NextRequest, NextResponse } from 'next/server'
import {
  getDxFeedAccounts,
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

    const sanitized = await Promise.all(
      (result.synchronizations || []).map(async ({ token, ...rest }) => {
        let accountNumbers: string[] = []
        if (token) {
          try {
            const parsed = JSON.parse(token) as {
              accessToken?: string
              historicalHost?: string
              accountNumbers?: string[]
            }

            if (Array.isArray(parsed.accountNumbers)) {
              accountNumbers = parsed.accountNumbers
            }

            if (
              accountNumbers.length === 0 &&
              typeof parsed.accessToken === 'string' &&
              typeof parsed.historicalHost === 'string'
            ) {
              const accounts = await getDxFeedAccounts(parsed.accessToken, parsed.historicalHost)
              accountNumbers = accounts.map(
                (account) =>
                  account.accountHeader || account.accountReference || account.accountId.toString(),
              )
            }
          } catch {
            /* ignore parse errors */
          }
        }

        return {
          ...rest,
          hasToken: !!token,
          accountNumbers,
        }
      }),
    )

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
