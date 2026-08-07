import { NextRequest, NextResponse } from 'next/server'
import { connectIbkrFlexAccount } from '@/app/[locale]/dashboard/components/import/ibkr/sync/actions'
import { IbkrErrorCode } from '@/lib/ibkr-flex-errors'

/**
 * Connecting validates the credentials against the live Flex service, which
 * involves waiting for IBKR to generate the report, so this needs more than the
 * default execution budget.
 */
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = typeof body?.input === 'string' ? body.input : ''

    if (!input.trim()) {
      return NextResponse.json(
        { success: false, message: IbkrErrorCode.CREDENTIALS_REQUIRED },
        { status: 400 },
      )
    }

    const result = await connectIbkrFlexAccount(input)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error, errorParams: result.errorParams },
        { status: 400 },
      )
    }

    // The connection can be stored successfully and still carry an error from
    // the import that followed it, so `message` rides along with success.
    return NextResponse.json({
      success: true,
      accountId: result.accountId,
      stats: result.stats,
      savedCount: result.savedCount ?? 0,
      tradesCount: result.tradesCount ?? 0,
      message: result.error,
      errorParams: result.errorParams,
    })
  } catch (error) {
    console.error('Error connecting IBKR Flex account:', error)
    return NextResponse.json(
      { success: false, message: IbkrErrorCode.UNKNOWN },
      { status: 500 },
    )
  }
}
