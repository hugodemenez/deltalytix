import { NextRequest, NextResponse } from 'next/server'
import { apiErrorBody, jsonError } from '@/lib/api/json-error'
import { authorizeAdminRequest } from '@/lib/admin/auth'
import {
  type AdminAccountResyncResult,
  resyncRithmicProtocolAccount,
} from '@/lib/rithmic-protocol/admin-account-resync'

export const maxDuration = 300

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function readOptionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Admin-only rebuild of one Rithmic Protocol trading account.
 *
 * Auth: session user in `ADMIN_USER_ID` / `ALLOWED_ADMIN_USER_ID` /
 * `ADMIN_USER_IDS`, or `Authorization: Bearer $CRON_SECRET`.
 * `CRON_SECRET` is shared with `/api/cron/daily-sync` and can invoke this
 * destructive path; keep it restricted to operator scripts. A dedicated
 * resync secret is not required yet.
 *
 * POST { userId, accountNumber, dryRun?: boolean, connectionId?: string,
 *        allowUnmatchedAnnotations?: boolean, anchorDate?: string }
 *
 * Dry-run is the default. Omitted `dryRun` previews without writing.
 * `dryRun: false` is required to apply. Non-boolean values are rejected.
 * `anchorDate` is a YYYY-MM-DD or strict ISO timestamp snapped to the CME
 * Friday 17:00 CT close. Future and >366-day-old anchors refuse.
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
      hint: 'Send { userId, accountNumber, dryRun?: boolean, anchorDate?: string }.',
    })
  }

  const payload =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const userId = readString(payload.userId)
  const accountNumber = readString(payload.accountNumber)
  if (!userId || !accountNumber) {
    return jsonError({
      code: 'bad_request',
      message: 'userId and accountNumber are required.',
      hint: 'Pass the target dashboard user id and the Rithmic trading account number.',
    })
  }

  if ('dryRun' in payload && typeof payload.dryRun !== 'boolean') {
    return jsonError({
      code: 'bad_request',
      message: 'dryRun must be a boolean when provided.',
      hint: 'Omit dryRun (defaults to true) or pass dryRun: true / dryRun: false. Strings and numbers are rejected.',
      details: [{ field: 'dryRun', message: 'Must be a JSON boolean.' }],
    })
  }

  if (
    'allowUnmatchedAnnotations' in payload &&
    typeof payload.allowUnmatchedAnnotations !== 'boolean'
  ) {
    return jsonError({
      code: 'bad_request',
      message: 'allowUnmatchedAnnotations must be a boolean when provided.',
      hint: 'This flag is ignored. Unmatched annotated rows always refuse.',
      details: [
        {
          field: 'allowUnmatchedAnnotations',
          message: 'Must be a JSON boolean.',
        },
      ],
    })
  }

  const connectionId = readOptionalString(payload.connectionId)
  if (connectionId === '') {
    return jsonError({
      code: 'bad_request',
      message: 'connectionId must be a non-empty string when provided.',
      hint: 'Omit connectionId to use the sole matching connection.',
      details: [{ field: 'connectionId', message: 'Blank.' }],
    })
  }

  const anchorDate = readOptionalString(payload.anchorDate)
  if (anchorDate === '') {
    return jsonError({
      code: 'bad_request',
      message: 'anchorDate must be a non-empty string when provided.',
      hint: 'Pass YYYY-MM-DD or an ISO timestamp, or omit it to use the latest Friday 17:00 CT close before the earliest fill.',
      details: [{ field: 'anchorDate', message: 'Blank.' }],
    })
  }

  const dryRun = typeof payload.dryRun === 'boolean' ? payload.dryRun : true
  try {
    const result = await resyncRithmicProtocolAccount({
      userId,
      accountNumber,
      dryRun,
      actor: auth.via === 'session' ? auth.actorUserId : 'cron',
      connectionId,
      allowUnmatchedAnnotations:
        typeof payload.allowUnmatchedAnnotations === 'boolean'
          ? payload.allowUnmatchedAnnotations
          : undefined,
      anchorDate,
    })

    if (!result.error || result.error === 'POST_COMMIT_WARNING') {
      return NextResponse.json(result)
    }
    return serviceErrorResponse(result)
  } catch (error) {
    console.error('[ADMIN-RESYNC] route failed', error)
    return jsonError({
      code: 'internal_error',
      message: 'Protocol resync failed.',
      hint: 'Retry the request. If it keeps failing, check server logs for [ADMIN-RESYNC].',
    })
  }
}

function serviceErrorResponse(result: AdminAccountResyncResult) {
  const mapping = errorMapping(result.error)
  const body = apiErrorBody({
    code: mapping.code,
    message: mapping.message,
    hint: mapping.hint,
  })
  return NextResponse.json(
    { ...body, result },
    {
      status: body.error.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  )
}

function errorMapping(error: string | undefined): {
  code:
    | 'not_found'
    | 'conflict'
    | 'unprocessable_entity'
    | 'internal_error'
    | 'bad_request'
  message: string
  hint: string
} {
  switch (error) {
    case 'NO_TOKEN_RECONNECT':
    case 'ACCOUNT_NOT_ON_CONNECTION':
      return {
        code: 'not_found',
        message: 'No Rithmic Protocol connection holds that account for this user.',
        hint: 'Confirm userId and accountNumber against the Connections page.',
      }
    case 'AMBIGUOUS_CONNECTION':
      return {
        code: 'conflict',
        message: 'More than one Protocol connection holds that account.',
        hint: 'Pass connectionId for the credential that should be rebuilt.',
      }
    case 'TOKEN_DECRYPT_FAILED':
      return {
        code: 'unprocessable_entity',
        message: 'The stored Protocol credential could not be decrypted.',
        hint: 'Re-authenticate the connection, then retry the preview.',
      }
    case 'EMPTY_UPSTREAM_HISTORY':
      return {
        code: 'conflict',
        message: 'Upstream history was empty; stored trades and fills were left unchanged.',
        hint: 'Do not retry a live rebuild until a dry-run shows a non-empty proposed ledger.',
      }
    case 'EMPTY_REBUILD':
      return {
        code: 'conflict',
        message: 'FIFO produced no closed trades from the merged ledger; stored trades were left unchanged.',
        hint: 'Inspect result.proposed. FIFO ran on in-window fills only. Do not retry a live rebuild until a dry-run shows closed trades to write.',
      }
    case 'UNMATCHED_ANNOTATIONS':
      return {
        code: 'conflict',
        message: 'Annotated trades would not survive the rebuild.',
        hint: 'Inspect result.proposed.unmatchedAnnotatedTrades. Unmatched annotated rows must be resolved; the override is ignored.',
      }
    case 'UNCOVERED_TRADES':
      return {
        code: 'conflict',
        message: 'Stored trades have fill legs outside the in-window fills.',
        hint: 'Inspect result.proposed.uncoveredTrades. Coverage uses fill identity, time, side, quantity, and price.',
      }
    case 'DUPLICATE_TRADE_IDS':
    case 'INSERT_MISMATCH':
      return {
        code: 'conflict',
        message: 'Rebuilt trade rows did not insert as planned.',
        hint: 'Stored data was left unchanged. Retry a dry-run; skipDuplicates cannot report a full rebuild.',
      }
    case 'CONCURRENT_SYNC':
      return {
        code: 'conflict',
        message: 'The account changed while the rebuild was running.',
        hint: 'Retry the dry-run, then apply once no ordinary sync is in flight.',
      }
    case 'LOCK_TIMEOUT':
    case 'LOCK_UNAVAILABLE':
    case 'LOCK_LOST':
      return {
        code: 'conflict',
        message: 'Could not take the protocol sync lock for this account.',
        hint: 'Confirm DIRECT_URL is session-mode Postgres, then retry. Ordinary sync uses the same account lock.',
      }
    case 'INVALID_STORED_CREDENTIALS':
      return {
        code: 'unprocessable_entity',
        message: 'The stored Protocol credential is incomplete.',
        hint: 'Re-authenticate the connection, then retry.',
      }
    case 'OPENING_NOT_FLAT':
      return {
        code: 'conflict',
        message: 'The weekend anchor does not start flat for every symbol.',
        hint: 'Inspect result.proposed.positionChecks and openingNotFlatReport. A non-zero P_0 can be a carried position, a missing window, an expiry, or a reset. This rebuild never invents opening-seed lots.',
      }
    case 'POSITION_SNAPSHOT_UNAVAILABLE':
    case 'POSITION_SNAPSHOT_MOVED':
    case 'POSITION_SNAPSHOT_STALE':
      return {
        code: 'conflict',
        message: 'Broker instrument positions could not be trusted for this rebuild.',
        hint: 'The account must be quiet with a complete PnL snapshot: explicit matching 451 account_id and net_quantity equal to the 450 sum. Missing 450s are flat only when 451 net is 0. A 400ms settle after 403 still refuses a late 450.',
      }
    case 'ACCOUNT_REJECTED':
    case 'ACCOUNT_NOT_FOUND':
      return {
        code: 'conflict',
        message: 'The broker rejected or did not list this trading account.',
        hint: 'Confirm the account is live on that Protocol login. A rejected snapshot is never treated as flat.',
      }
    case 'FILLS_MISSING_SSBOE':
    case 'FILLS_MISSING_TIMESTAMP':
    case 'FILLS_MISSING_PRICE':
    case 'FILLS_DROPPED':
    case 'FILLS_UNKNOWN_SIDE':
      return {
        code: 'unprocessable_entity',
        message: 'Upstream fills are missing timestamps, prices, or a known side.',
        hint: 'A rebuild refuses fills without ssboe so FIFO cannot fall back to session-open clocks, and dropped plant rows never pass silently.',
      }
    case 'WINDOW_DOES_NOT_REACH_ANCHOR':
    case 'INCOMPLETE_FILL_HISTORY':
    case 'FILL_FETCH_TIMEOUT':
    case 'HISTORY_TRUNCATED':
      return {
        code: 'conflict',
        message: 'Fill history did not cover the weekend-anchor window.',
        hint: 'Partial, timed-out, truncated, or unresolved rp_code 7 windows are never applied. Inspect result.proposed.fillWindow.coverage.',
      }
    case 'FIFO_OPEN_LOTS':
    case 'FIFO_SKIPPED_FILLS':
      return {
        code: 'conflict',
        message: 'FIFO leftover lots did not match the broker end position.',
        hint: 'Inspect result.proposed.positionChecks. Stored trades were left unchanged.',
      }
    case 'ORDINARY_SYNC_DIVERGENCE':
    case 'UNSTORED_PRE_ANCHOR_FILLS':
    case 'ORDINARY_SYNC_REAP':
    case 'FIFO_TIMESTAMP_TIE':
      return {
        code: 'conflict',
        message: 'The next ordinary sync would not reproduce this rebuild.',
        hint: 'The rebuild persists only in-window fills. Unstored pre-anchor fills in the fetch range, residual open lots, timestamp ties, or a phantom reap all refuse. Pass an earlier Friday only when those fills are already on the ledger.',
      }
    case 'STORED_FILL_MISSING_UPSTREAM':
      return {
        code: 'conflict',
        message: 'A stored in-window fill was not present in upstream history.',
        hint: 'Coverage uses fill identity (id, time, quantity, price), not a bare fill id.',
      }
    case 'COMMISSION_RATES_UNAVAILABLE':
      return {
        code: 'conflict',
        message: 'Product RMS commission rates were missing; the rebuild will not write silent zero commissions.',
        hint: 'Retry when RMS is available, or review stored commissions on rematched rows.',
      }
    case 'CONNECTION_UNLINKED':
      return {
        code: 'conflict',
        message: 'The Protocol connection was unlinked while the rebuild was running.',
        hint: 'Stored data was left unchanged. Re-link the account and retry a dry-run.',
      }
    case 'INVALID_ANCHOR_DATE':
    case 'ANCHOR_IN_FUTURE':
    case 'ANCHOR_TOO_OLD':
      return {
        code: 'bad_request',
        message: 'anchorDate is not a past, bounded weekend close.',
        hint: 'Pass YYYY-MM-DD or a strict ISO timestamp within the last 366 days. A stored row older than that cannot be the default anchor; choose a later Friday explicitly.',
      }
    case 'FETCH_FAILED':
    case 'APPLY_FAILED':
    case 'SYNC_FAILED':
      return {
        code: 'internal_error',
        message: 'Protocol resync failed before replacing stored trades.',
        hint: 'Stored data was not deleted. Check [ADMIN-RESYNC] logs and retry a dry-run first.',
      }
    default:
      return {
        code: 'internal_error',
        message: 'Protocol resync failed.',
        hint: 'Retry a dry-run. If it keeps failing, check server logs for [ADMIN-RESYNC].',
      }
  }
}
