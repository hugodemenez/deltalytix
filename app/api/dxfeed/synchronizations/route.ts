import { NextRequest, NextResponse } from 'next/server'
import {
  getDxFeedAccounts,
  getDxFeedSynchronizations,
  markDxFeedConnectionExpired,
  removeDxFeedToken,
} from '@/app/[locale]/dashboard/components/import/dxfeed/sync/actions'
import { DxFeedErrorCode } from '@/lib/dxfeed-errors'
import { isDxFeedAccessTokenExpired } from '@/lib/dxfeed-token'
import { detectDxFeedPropFirmFromHost } from '@/lib/dxfeed-propfirms'

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
          try {
            const parsed = JSON.parse(token) as {
              accessToken?: string
              historicalHost?: string
              accountNumbers?: string[]
              propfirmName?: string
              tokenExpirationSource?: 'provider' | 'jwt'
            }

            tokenExpired = isDxFeedAccessTokenExpired(
              parsed.accessToken ?? '',
              tokenExpiresAt,
              {
                expirationIsAuthoritative:
                  parsed.tokenExpirationSource === 'provider',
              },
            )

            propFirmName =
              parsed.propfirmName ??
              detectDxFeedPropFirmFromHost(parsed.historicalHost)?.name ??
              null

            if (Array.isArray(parsed.accountNumbers)) {
              accountNumbers = parsed.accountNumbers
            }

            if (
              !tokenExpired &&
              accountNumbers.length === 0 &&
              typeof parsed.accessToken === 'string' &&
              typeof parsed.historicalHost === 'string'
            ) {
              const accountsResult = await getDxFeedAccounts(
                parsed.accessToken,
                parsed.historicalHost,
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
            tokenExpired = isDxFeedAccessTokenExpired('', tokenExpiresAt)
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
