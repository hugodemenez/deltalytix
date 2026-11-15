import { NextRequest, NextResponse } from 'next/server'
import { jsonError } from '@/lib/api/json-error'
import { authorizeAdminRequest } from '@/lib/admin/auth'
import { insertManualRithmicProtocolFill } from '@/lib/rithmic-protocol/manual-fill'

/**
 * Admin-only insert of one manual Rithmic Protocol fill.
 *
 * Auth: session user in `ADMIN_USER_ID` / `ALLOWED_ADMIN_USER_ID` /
 * `ADMIN_USER_IDS`, or `Authorization: Bearer $CRON_SECRET`, same as
 * `/api/admin/rithmic-protocol/resync`.
 *
 * POST { userId, accountNumber, symbol, exchange, side, qty, price,
 *        timestamp, note, dryRun?: boolean }
 *
 * Dry-run is the default. `dryRun: false` writes. The same economic fill
 * (user, account, symbol, exchange, side, qty, price, timestamp) is one row.
 * `note` is required and logged; it is not stored on the fill.
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
          ? 'Sign in as an allowlisted admin.'
          : 'This account is not on the admin allowlist.',
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError({
      code: 'bad_request',
      message: 'Request body must be JSON.',
      hint: 'Send { userId, accountNumber, symbol, exchange, side, qty, price, timestamp, note, dryRun?: boolean }.',
    })
  }

  const payload =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null
  if (!payload) {
    return jsonError({
      code: 'bad_request',
      message: 'Request body must be a JSON object.',
      hint: 'Send { userId, accountNumber, symbol, exchange, side, qty, price, timestamp, note, dryRun?: boolean }.',
    })
  }
  if ('dryRun' in payload && typeof payload.dryRun !== 'boolean') {
    return jsonError({
      code: 'bad_request',
      message: 'dryRun must be a boolean when provided.',
      hint: 'Omit dryRun (defaults to true) or pass dryRun: true / dryRun: false.',
      details: [{ field: 'dryRun', message: 'Must be a JSON boolean.' }],
    })
  }

  try {
    const result = await insertManualRithmicProtocolFill({
      ...payload,
      dryRun: payload.dryRun === false ? false : true,
    })
    if (result.ok) {
      console.info(
        `[RITHMIC-MANUAL-FILL] route actor=${auth.via === 'session' ? auth.actorUserId : 'cron'} dryRun=${result.dryRun} idempotent=${result.idempotent} fillId=${result.fillId}`,
      )
      return NextResponse.json(result)
    }
    if (result.status === 'account_not_found') {
      return jsonError({
        code: 'not_found',
        message: 'No account with that number belongs to this user.',
        hint: 'Confirm userId and accountNumber against the Connections page.',
        details: result.errors,
      })
    }
    if (result.status === 'conflict') {
      return jsonError({
        code: 'conflict',
        message: 'A plant fill already uses this identity.',
        hint: 'Nothing was written. Do not reuse a plant fill id for a manual patch.',
        details: result.errors,
      })
    }
    return jsonError({
      code: 'bad_request',
      message: 'Manual fill input is invalid.',
      hint: 'Pass userId, accountNumber, symbol, exchange, side (buy or sell), qty > 0, a non-zero price, an ISO timestamp, and a note.',
      details: result.errors,
    })
  } catch (error) {
    console.error('[RITHMIC-MANUAL-FILL] route failed', error)
    return jsonError({
      code: 'internal_error',
      message: 'Manual fill insert failed.',
      hint: 'Retry the preview. If it keeps failing, check server logs for [RITHMIC-MANUAL-FILL].',
    })
  }
}
