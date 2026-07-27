import { NextRequest, NextResponse } from 'next/server'
import { syncIbkrAccount } from '@/app/[locale]/dashboard/components/import/ibkr/sync/actions'
import { IbkrErrorCode } from '@/lib/ibkr-flex-errors'

/** Flex report generation is asynchronous; allow time for the polling loop. */
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const accountId = typeof body?.accountId === 'string' ? body.accountId : undefined

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: IbkrErrorCode.ACCOUNT_ID_REQUIRED },
        { status: 400 },
      )
    }

    const result = await syncIbkrAccount(accountId)

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          message: result.error,
          errorParams: result.errorParams,
          stats: result.stats,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      savedCount: result.savedCount ?? 0,
      tradesCount: result.tradesCount ?? 0,
      stats: result.stats,
    })
  } catch (error) {
    console.error('Error performing IBKR sync:', error)
    return NextResponse.json(
      { success: false, message: IbkrErrorCode.SYNC_FAILED },
      { status: 500 },
    )
  }
}
