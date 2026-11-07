/**
 * Admin-only 450 / 451 / 403 snapshot reducer. Ordinary sync still ignores
 * instrument rows inside `getAccountPnLSnapshots`.
 *
 * Complete means: 403 with rp_code 0, a matching 451 for the account, no
 * no-data, no malformed 450, and no 450 after 403. A missing 450 is flat
 * only when that 451 evidence exists.
 */
import {
  inspectInstrumentPnLUpdate,
  type CapturedInstrumentSnapshot,
  type InstrumentPnLPositionUpdateFields,
  type RithmicProtocolInstrumentPosition,
} from './instrument-position'

function rpOk(rpCode: unknown): boolean {
  if (!Array.isArray(rpCode) || rpCode.length === 0) return false
  return String(rpCode[0]) === '0'
}

function rpIsNoData(rpCode: unknown): boolean {
  if (!Array.isArray(rpCode) || rpCode.length === 0) return false
  return String(rpCode[0]) === '7'
}

export type InstrumentSnapshotSession = {
  accountPnL(accountId?: string): void
  instrumentPnL(decoded: InstrumentPnLPositionUpdateFields): void
  snapshotResponse(rpCode: unknown): void
  reject(): void
  markIncomplete(reason: string): void
  finish(capturedAtMs: number): CapturedInstrumentSnapshot
}

export function createInstrumentSnapshotSession(
  accountId: string,
): InstrumentSnapshotSession {
  const wanted = accountId.trim()
  const positionsByKey = new Map<string, RithmicProtocolInstrumentPosition>()
  const evidenceAccountIds: string[] = []
  const noDataAccountIds: string[] = []
  const incompleteAccountIds: string[] = []
  const rejectedAccountIds: string[] = []
  const malformedAccountIds: string[] = []
  const lateInstrumentAccountIds: string[] = []
  let responseSeen = false
  let responseOk = false
  let reason: string | undefined

  const touch = (list: string[], id: string) => {
    if (id && !list.includes(id)) list.push(id)
  }

  return {
    accountPnL(id) {
      const resolved = (id ?? wanted).trim()
      if (resolved) touch(evidenceAccountIds, resolved)
    },
    instrumentPnL(decoded) {
      const id = String(decoded.accountId ?? wanted).trim() || wanted
      if (responseSeen) {
        touch(lateInstrumentAccountIds, id)
        reason = reason ?? 'late_instrument_update'
      }
      const inspected = inspectInstrumentPnLUpdate({
        ...decoded,
        accountId: decoded.accountId || wanted,
      })
      if (inspected.status === 'ignored') return
      if (inspected.status === 'malformed') {
        touch(malformedAccountIds, id)
        reason = reason ?? inspected.reason
        return
      }
      if (inspected.position.accountId === wanted) {
        positionsByKey.set(
          `${inspected.position.accountId}|${inspected.position.symbol}`,
          inspected.position,
        )
      }
    },
    snapshotResponse(rpCode) {
      responseSeen = true
      if (rpIsNoData(rpCode)) {
        touch(noDataAccountIds, wanted)
        reason = reason ?? 'no_data'
        return
      }
      if (!rpOk(rpCode)) {
        touch(incompleteAccountIds, wanted)
        reason = reason ?? (Array.isArray(rpCode) && rpCode.length > 0 ? 'rp_error' : 'missing_rp_code')
        return
      }
      responseOk = true
    },
    reject() {
      touch(rejectedAccountIds, wanted)
      reason = reason ?? 'rejected'
    },
    markIncomplete(nextReason) {
      touch(incompleteAccountIds, wanted)
      reason = reason ?? nextReason
    },
    finish(capturedAtMs) {
      const evidence = evidenceAccountIds.includes(wanted)
      const noData = noDataAccountIds.includes(wanted)
      const rejected = rejectedAccountIds.includes(wanted)
      const malformed = malformedAccountIds.includes(wanted)
      const late = lateInstrumentAccountIds.includes(wanted)
      const incompleteListed = incompleteAccountIds.includes(wanted)
      const complete =
        Boolean(wanted) &&
        responseOk &&
        evidence &&
        !noData &&
        !rejected &&
        !malformed &&
        !late &&
        !incompleteListed
      if (!complete && !reason) {
        if (!responseSeen) reason = 'incomplete'
        else if (!evidence) reason = 'no_evidence'
      }
      if (!complete && !incompleteListed && !rejected && !noData) {
        touch(incompleteAccountIds, wanted)
      }
      return {
        positions: [...positionsByKey.values()],
        complete,
        reason: complete ? undefined : reason ?? 'incomplete',
        capturedAtMs,
        capturedUntilMs: Date.now(),
        noDataAccountIds,
        incompleteAccountIds,
        rejectedAccountIds,
        missingAccountIds: [],
        evidenceAccountIds,
        requestedAccountIds: wanted ? [wanted] : [],
        malformedAccountIds,
        lateInstrumentAccountIds,
      }
    },
  }
}

export const MAX_INSTRUMENT_SNAPSHOT_AGE_MS = 30_000

export function snapshotIsFresh(
  snapshot: Pick<CapturedInstrumentSnapshot, 'capturedUntilMs'>,
  nowMs = Date.now(),
  maxAgeMs = MAX_INSTRUMENT_SNAPSHOT_AGE_MS,
): boolean {
  return nowMs - snapshot.capturedUntilMs <= maxAgeMs
}

/** True when a fill's clock sits inside a snapshot's capture bracket. */
export function fillFallsInsideSnapshotBracket(
  fillMs: number,
  snapshot: Pick<CapturedInstrumentSnapshot, 'capturedAtMs' | 'capturedUntilMs'>,
): boolean {
  if (fillMs <= 0) return false
  return fillMs >= snapshot.capturedAtMs && fillMs <= snapshot.capturedUntilMs
}
