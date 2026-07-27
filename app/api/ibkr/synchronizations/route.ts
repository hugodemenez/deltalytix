import { NextRequest, NextResponse } from 'next/server'
import {
  getIbkrConnections,
  removeIbkrConnection,
} from '@/app/[locale]/dashboard/components/import/ibkr/sync/actions'
import { IbkrErrorCode } from '@/lib/ibkr-flex-errors'
import { decryptConnectionToken } from '@/lib/connection-token-crypto'
import type { IbkrStoredCredentials } from '@/app/[locale]/dashboard/components/import/ibkr/sync/ibkr-types'

export async function GET() {
  try {
    const result = await getIbkrConnections()
    if (result.error) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 })
    }

    // The stored token is a credential bundle and must never reach the client;
    // only the derived display fields do.
    const sanitized = (result.connections ?? []).map(
      ({ token, tokenExpiresAt, externalId, ...rest }) => {
        let accountNumbers: string[] = []
        let currencies: string[] = []

        if (token) {
          try {
            const parsed = JSON.parse(
              decryptConnectionToken(token) ?? '{}',
            ) as Partial<IbkrStoredCredentials>
            if (Array.isArray(parsed.accountNumbers)) accountNumbers = parsed.accountNumbers
            if (Array.isArray(parsed.currencies)) currencies = parsed.currencies
          } catch {
            // Unreadable bundle: surfaced as a disconnected row below.
          }
        }

        // Flex never reports a token's expiry, so a past `tokenExpiresAt` only
        // ever means "IBKR rejected this token on the last attempt".
        const tokenExpired = !!tokenExpiresAt && tokenExpiresAt.getTime() <= Date.now()

        return {
          ...rest,
          // The client keys connections by the Flex query ID.
          accountId: externalId,
          hasToken: !!token && !tokenExpired,
          tokenExpired,
          accountNumbers,
          currencies,
        }
      },
    )

    return NextResponse.json({ success: true, data: sanitized })
  } catch (error) {
    console.error('Error fetching IBKR connections:', error)
    return NextResponse.json(
      { success: false, message: IbkrErrorCode.LOAD_SYNCHRONIZATIONS_FAILED },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const accountId = typeof body?.accountId === 'string' ? body.accountId : undefined

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: IbkrErrorCode.ACCOUNT_ID_REQUIRED },
        { status: 400 },
      )
    }

    const result = await removeIbkrConnection(accountId)
    if (result.error) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting IBKR connection:', error)
    return NextResponse.json(
      { success: false, message: IbkrErrorCode.DELETE_SYNC_FAILED },
      { status: 500 },
    )
  }
}
