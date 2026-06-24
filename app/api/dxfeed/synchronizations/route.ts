import { NextRequest, NextResponse } from 'next/server'
import {
  getDxFeedAccounts,
  getDxFeedSynchronizations,
  markDxFeedConnectionExpired,
  removeDxFeedToken,
} from '@/app/[locale]/dashboard/components/import/dxfeed/sync/actions'
import { DxFeedErrorCode } from '@/lib/dxfeed-errors'
import { coerceDxFeedHistoricalHostForSync } from '@/lib/dxfeed-historical-host'
import { getDxFeedPropFirm } from '@/lib/dxfeed-propfirms'
import { isDxFeedTokenExpired } from '@/lib/dxfeed-token'

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
      (result.synchronizations || []).map(async ({ token, tokenExpiresAt, ...rest }) => {
        let accountNumbers: string[] = []
        let propFirmName: string | null = null
        let tokenExpired = false
        let apiUnauthorized = false

        if (token) {
          tokenExpired = isDxFeedTokenExpired(tokenExpiresAt)

          try {
            const parsed = JSON.parse(token) as {
              accessToken?: string
              historicalHost?: string
              accountNumbers?: string[]
              propFirmId?: string
              propfirmName?: string
            }

            const firm = getDxFeedPropFirm(parsed.propFirmId)
            propFirmName = firm?.name ?? parsed.propfirmName ?? null

            if (Array.isArray(parsed.accountNumbers)) {
              accountNumbers = parsed.accountNumbers
            }

            if (
              !tokenExpired &&
              accountNumbers.length === 0 &&
              typeof parsed.accessToken === 'string' &&
              typeof parsed.historicalHost === 'string' &&
              firm
            ) {
              const historicalHost = coerceDxFeedHistoricalHostForSync(
                parsed.historicalHost,
                firm,
              )
              const accountsResult = await getDxFeedAccounts(
                parsed.accessToken,
                historicalHost,
              )
              if (!accountsResult.ok && accountsResult.unauthorized) {
                apiUnauthorized = true
                await markDxFeedConnectionExpired(rest.accountId)
              } else if (accountsResult.ok) {
                accountNumbers = accountsResult.accounts.map(
                  (account) =>
                    account.accountHeader ||
                    account.accountReference ||
                    account.accountId.toString(),
                )
              }
            }
          } catch {
            /* ignore parse errors */
          }

          if (apiUnauthorized) {
            tokenExpired = true
          }
        }

        const connectionActive = !!token && !tokenExpired

        return {
          ...rest,
          tokenExpiresAt,
          hasToken: connectionActive,
          tokenExpired: !!token && tokenExpired,
          propFirmName,
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
      { success: false, message: DxFeedErrorCode.LOAD_SYNCHRONIZATIONS_FAILED },
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
        { success: false, message: DxFeedErrorCode.ACCOUNT_ID_REQUIRED },
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
      { success: false, message: DxFeedErrorCode.DELETE_SYNC_FAILED },
      { status: 500 },
    )
  }
}
