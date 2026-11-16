import { NextRequest, NextResponse } from 'next/server'
import { jsonError } from '@/lib/api/json-error'
import { authorizeAdminRequest } from '@/lib/admin/auth'
import {
  confirmDistinctManualRithmicProtocolFill,
  insertManualRithmicProtocolFill,
  retireManualRithmicProtocolFill,
} from '@/lib/rithmic-protocol/manual-fill'

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

  const actor = auth.via === 'session' ? (auth.actorUserId ?? 'admin') : 'cron'
  try {
    if (payload.action === 'retire') {
      const retired = await retireManualRithmicProtocolFill({
        ...payload,
        dryRun: payload.dryRun === false ? false : true,
        retiredBy: actor,
      })
      if (retired.ok) {
        console.info(
          `[RITHMIC-MANUAL-FILL] route retire actor=${actor} dryRun=${retired.dryRun} fillId=${retired.fillId}`,
        )
        return NextResponse.json(retired)
      }
      if (retired.status === 'acknowledgement_required') {
        return jsonError({
          code: 'conflict',
          message: 'Apply refused while an annotated trade still uses this manual fill.',
          hint: 'Move the annotation if you want to keep it, delete the stored row, then run a sync or rebuild. Then re-send the retire. Annotated rows are never deleted automatically.',
          details: (retired.trades ?? []).map((trade) => ({
            field: 'trades',
            message: `${trade.id} ${trade.instrument ?? ''} entry=${trade.entryId ?? ''} close=${trade.closeId ?? ''} annotated=${trade.annotated}`,
          })),
        })
      }
      if (retired.status === 'not_found') {
        return jsonError({
          code: 'not_found',
          message: 'No manual fill with that id belongs to this account.',
          hint: 'Pass the manual- fill id from the insert preview, plus userId and accountNumber.',
          details: retired.errors,
        })
      }
      return jsonError({
        code: 'bad_request',
        message: 'Manual fill retire input is invalid.',
        hint: 'Send { action: "retire", userId, accountNumber, fillId, reason, dryRun?: boolean }.',
        details: retired.errors,
      })
    }
    if (payload.action === 'confirm-distinct') {
      const marked = await confirmDistinctManualRithmicProtocolFill({
        ...payload,
        dryRun: payload.dryRun === false ? false : true,
        confirmedDistinctBy: actor,
      })
      if (!marked.ok && marked.status === 'acknowledgement_required') {
        const annotated = marked.errors?.some(
          (error) => error.field === 'acknowledgeAnnotatedTrades',
        )
        const reapDeferred = marked.errors?.some(
          (error) => error.field === 'acknowledgeReapDeferred',
        )
        const unrelated = marked.relation?.kind === 'unrelated'
        const relation = marked.relation
        const details = [
          ...(marked.errors ?? []),
          ...(relation
            ? [
                {
                  field: 'relation',
                  message:
                    relation.kind === 'near-miss'
                      ? `near-miss ${relation.reason}`
                      : relation.kind,
                },
                { field: 'orderFillId', message: relation.orderFillId },
              ]
            : []),
          {
            field: 'previousConfirmedDistinctFillId',
            message: marked.previousConfirmedDistinctFillId ?? '',
          },
          ...(marked.trades ?? []).map((trade) => ({
            field: 'trades',
            message: `${trade.id} ${trade.instrument ?? ''} entry=${trade.entryId ?? ''} close=${trade.closeId ?? ''} annotated=${trade.annotated}`,
          })),
          ...(marked.tradeEffects
            ? [
                { field: 'displacedTrades', message: String(marked.tradeEffects.displaced) },
                { field: 'annotatedTrades', message: String(marked.tradeEffects.annotated) },
                ...(marked.tradeEffects.nextBookBlocked
                  ? [
                      {
                        field: 'nextBookBlocked',
                        message:
                          'Another near-miss still blocks this symbol. Sync will not derive a book until that near-miss is resolved.',
                      },
                    ]
                  : []),
                ...(marked.tradeEffects.reapDeferred
                  ? [
                      {
                        field: 'reapDeferred',
                        message:
                          'Another near-miss on this account keeps reap off. The next sync can leave these displaced rows beside the new pairs until that near-miss is resolved.',
                      },
                    ]
                  : []),
              ]
            : []),
        ]
        return jsonError({
          code: 'conflict',
          message: annotated
            ? 'Confirm-distinct refused while an annotated trade would lose its fill pair.'
            : reapDeferred
              ? 'Confirm-distinct refused because another near-miss on this account keeps the displaced rows.'
              : unrelated
                ? 'Confirm-distinct refused because that plant fill is unrelated to the manual.'
                : 'Confirm-distinct refused because that plant fill matches the manual exactly.',
          hint: annotated
            ? 'Move the annotation if you want to keep it, delete the stored row, then run a sync or rebuild. Then re-send dryRun: false with acknowledgeAnnotatedTrades: true.'
            : reapDeferred
              ? 'Re-send dryRun: false with acknowledgeReapDeferred: true only if the next sync may leave the displaced rows until every near-miss on this account is resolved.'
              : unrelated
                ? 'Re-send dryRun: false with acknowledgeUnrelated: true only if this plant fill should stay distinct from the manual.'
                : 'Re-send dryRun: false with acknowledgeExactMatch: true only if both executions should count.',
          details,
        })
      }
      if (marked.ok) {
        console.info(
          `[RITHMIC-MANUAL-FILL] route confirm-distinct actor=${actor} dryRun=${marked.dryRun} fillId=${marked.fillId} upstreamFillId=${marked.upstreamFillId}`,
        )
        return NextResponse.json(marked)
      }
      if (marked.status === 'not_found') {
        const missingPlant = marked.errors?.some((error) => error.field === 'upstreamFillId')
        return jsonError({
          code: 'not_found',
          message: missingPlant
            ? 'No plant fill with that id, symbol, and side belongs to this account.'
            : 'No manual fill with that id belongs to this account.',
          hint: 'Pass the manual- fill id, the plant fill id, userId, and accountNumber.',
          details: marked.errors,
        })
      }
      return jsonError({
        code: 'bad_request',
        message: 'Confirm-distinct input is invalid.',
        hint: 'Send { action: "confirm-distinct", userId, accountNumber, fillId, upstreamFillId, reason, dryRun?: boolean }.',
        details: marked.errors,
      })
    }
    const result = await insertManualRithmicProtocolFill({
      ...payload,
      dryRun: payload.dryRun === false ? false : true,
    })
    if (result.ok) {
      console.info(
        `[RITHMIC-MANUAL-FILL] route actor=${actor} dryRun=${result.dryRun} idempotent=${result.idempotent} fillId=${result.fillId}`,
      )
      return NextResponse.json(result)
    }
    if (result.status === 'acknowledgement_required') {
      return jsonError({
        code: 'conflict',
        message: 'Apply refused until the preview warning is acknowledged.',
        hint: 'Re-send dryRun: false with acknowledgeWarnings: true only when the plant fill should win, or retire the manual fill with action "retire".',
        details: (result.warnings ?? []).map((warning) => ({
          field: 'warnings',
          message: warning,
        })),
      })
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
