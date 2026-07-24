import { NextRequest, NextResponse } from 'next/server'
import {
  getRithmicProtocolSynchronizations,
  removeRithmicProtocolToken,
} from '@/app/[locale]/dashboard/components/import/rithmic-protocol/sync/actions'
import type { RithmicProtocolStoredCredentials } from '@/app/[locale]/dashboard/components/import/rithmic-protocol/sync/rithmic-protocol-types'

export async function GET() {
  try {
    const result = await getRithmicProtocolSynchronizations()
    if (result.error) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 },
      )
    }

    const sanitized = (result.synchronizations || []).map(
      ({ token, ...rest }) => {
        let accountNumbers: string[] = []
        let systemName: string | null = null
        let username: string | null = null

        if (token) {
          try {
            const parsed = JSON.parse(token) as RithmicProtocolStoredCredentials
            systemName = parsed.systemName ?? null
            username = parsed.username ?? null
            if (Array.isArray(parsed.accountIds)) {
              accountNumbers = parsed.accountIds
            }
          } catch {
            // ignore malformed token
          }
        }

        return {
          ...rest,
          hasToken: !!token,
          systemName,
          username,
          accountNumbers,
        }
      },
    )

    return NextResponse.json({ success: true, data: sanitized })
  } catch (error) {
    console.error('Error listing Rithmic Protocol synchronizations:', error)
    return NextResponse.json(
      { success: false, message: 'LOAD_SYNCHRONIZATIONS_FAILED' },
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
        { success: false, message: 'ACCOUNT_ID_REQUIRED' },
        { status: 400 },
      )
    }

    const result = await removeRithmicProtocolToken(accountId)
    if (result.error) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 },
      )
    }

    return NextResponse.json({ success: true, message: 'Synchronization removed' })
  } catch (error) {
    console.error('Error deleting Rithmic Protocol synchronization:', error)
    return NextResponse.json(
      { success: false, message: 'DELETE_SYNC_FAILED' },
      { status: 500 },
    )
  }
}
