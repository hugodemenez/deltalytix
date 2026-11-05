import { NextRequest, NextResponse } from 'next/server'
import { jsonError } from '@/lib/api/json-error'
import { authorizeAdminRequest } from '@/lib/admin/auth'
import { resyncRithmicProtocolAccount } from '@/lib/rithmic-protocol/admin-account-resync'

export const maxDuration = 300

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Admin-only rebuild of one Rithmic Protocol trading account.
 *
 * Auth: session user in `ADMIN_USER_ID` / `ALLOWED_ADMIN_USER_ID` /
 * `ADMIN_USER_IDS`, or `Authorization: Bearer $CRON_SECRET`.
 *
 * POST { userId, accountNumber, dryRun?: boolean }
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request)
  if (!auth.ok) {
    return jsonError({
      code: auth.status === 401 ? 'unauthorized' : 'forbidden',
      message:
        auth.status === 401
          ? 'Admin authentication is required.'
          : 'This user is not on the admin allowlist.',
      hint:
        auth.status === 401
          ? 'Sign in as an allowlisted admin or send Authorization: Bearer $CRON_SECRET.'
          : 'Set ADMIN_USER_ID / ADMIN_USER_IDS to this user, or use the cron secret.',
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError({
      code: 'bad_request',
      message: 'Request body must be JSON.',
      hint: 'Send { userId, accountNumber, dryRun?: boolean }.',
    })
  }

  const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const userId = readString(payload.userId)
  const accountNumber = readString(payload.accountNumber)
  if (!userId || !accountNumber) {
    return jsonError({
      code: 'bad_request',
      message: 'userId and accountNumber are required.',
      hint: 'Pass the target dashboard user id and the Rithmic trading account number.',
    })
  }

  const dryRun = payload.dryRun === true
  try {
    const result = await resyncRithmicProtocolAccount({
      userId,
      accountNumber,
      dryRun,
      actor: auth.via === 'session' ? auth.actorUserId : 'cron',
    })

    if (result.error === 'NO_TOKEN_RECONNECT' || result.error === 'ACCOUNT_NOT_ON_CONNECTION') {
      return jsonError({
        code: 'not_found',
        message: 'No Rithmic Protocol connection holds that account for this user.',
        hint: 'Confirm userId and accountNumber against the Connections page.',
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[ADMIN-RESYNC] route failed', error)
    return jsonError({
      code: 'internal_error',
      message: 'Protocol resync failed.',
      hint: 'Retry the request. If it keeps failing, check server logs for [ADMIN-RESYNC].',
    })
  }
}
