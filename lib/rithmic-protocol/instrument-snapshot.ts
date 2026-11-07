/**
 * Admin-only 450 / 451 / 403 snapshot reducer. Ordinary sync still ignores
 * instrument rows inside `getAccountPnLSnapshots`.
 *
 * Complete means: 403 with rp_code 0, a 451 whose account_id matches the
 * target (no fallback), 451 net_quantity equals the summed 450 nets, no
 * no-data, no malformed 450, no conflicting duplicate 450, and no target
 * snapshot 450 after 403. A missing 450 is flat only when 451 net is 0
 * (explicit, or omitted and corroborated by flat 450s plus
 * open_position_quantity). Offsetting omitted 450s that still sum to 0 are a
 * plant-dependent limit when that field is also omitted. An omitted 451 net
 * after an explicit one is a no-op.
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

function parseNetQuantity(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) return null
    return value
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Number(value.trim())
  }
  return null
}

export type AccountPnLCorroboration = {
  openPositionQuantity?: number | string
  buyQty?: number | string
  sellQty?: number | string
  fillBuyQty?: number | string
  fillSellQty?: number | string
}

export type InstrumentSnapshotSession = {
  accountPnL(
    accountId?: string,
    netQuantity?: number | string,
    extra?: AccountPnLCorroboration,
  ): void
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
  let accountNet: number | null = null
  let accountNetSeen = false
  let accountNetOmitted = false
  let corroborationZero = true

  const touch = (list: string[], id: string) => {
    if (id && !list.includes(id)) list.push(id)
  }

  return {
    accountPnL(id, netQuantity, extra) {
      const resolved = String(id ?? '').trim()
      if (!resolved || resolved !== wanted) return
      touch(evidenceAccountIds, resolved)
      const extras = [extra?.openPositionQuantity]
      for (const value of extras) {
        if (value == null || value === '') continue
        const parsedExtra = parseNetQuantity(value)
        if (parsedExtra == null) {
          corroborationZero = false
          continue
        }
        if (parsedExtra !== 0) corroborationZero = false
      }
      if (netQuantity == null) {
        if (accountNetSeen && !accountNetOmitted && accountNet != null) {
          return
        }
        accountNetOmitted = true
        accountNetSeen = true
        return
      }
      const parsed = parseNetQuantity(netQuantity)
      if (parsed == null) {
        touch(malformedAccountIds, resolved)
        reason = reason ?? 'invalid_account_net'
        return
      }
      if (accountNetSeen && !accountNetOmitted && accountNet !== parsed) {
        touch(malformedAccountIds, resolved)
        reason = reason ?? 'conflicting_account_net'
        return
      }
      accountNet = parsed
      accountNetSeen = true
      accountNetOmitted = false
    },
    instrumentPnL(decoded) {
      const inspected = inspectInstrumentPnLUpdate(decoded)
      if (inspected.status === 'ignored') return
      if (inspected.status === 'malformed') {
        const id = String(decoded.accountId ?? '').trim()
        if (id && id !== wanted) return
        if (id === wanted && responseSeen) {
          touch(lateInstrumentAccountIds, wanted)
          reason = reason ?? 'late_instrument_update'
        }
        touch(malformedAccountIds, wanted)
        reason = reason ?? inspected.reason
        return
      }
      if (inspected.position.accountId !== wanted) return
      if (responseSeen) {
        touch(lateInstrumentAccountIds, wanted)
        reason = reason ?? 'late_instrument_update'
      }
      const key = `${inspected.position.accountId}|${inspected.position.symbol}`
      const existing = positionsByKey.get(key)
      if (existing && existing.netQuantity !== inspected.position.netQuantity) {
        touch(malformedAccountIds, wanted)
        reason = reason ?? 'conflicting_instrument_net'
        return
      }
      positionsByKey.set(key, inspected.position)
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
      const positions = [...positionsByKey.values()]
      const summed = positions.reduce((sum, row) => sum + row.netQuantity, 0)
      if (accountNetOmitted) {
        const allFlat = positions.every((row) => row.netQuantity === 0)
        if (responseOk && allFlat && corroborationZero) {
          accountNet = 0
        } else {
          touch(malformedAccountIds, wanted)
          reason = reason ?? 'missing_account_net'
        }
      }
      const evidence = evidenceAccountIds.includes(wanted) && accountNetSeen
      const noData = noDataAccountIds.includes(wanted)
      const rejected = rejectedAccountIds.includes(wanted)
      const malformed = malformedAccountIds.includes(wanted)
      const late = lateInstrumentAccountIds.includes(wanted)
      const incompleteListed = incompleteAccountIds.includes(wanted)
      const netMismatch = evidence && accountNet != null && summed !== accountNet
      if (netMismatch) {
        reason = reason ?? 'account_net_mismatch'
        touch(malformedAccountIds, wanted)
      }
      const complete =
        Boolean(wanted) &&
        responseOk &&
        evidence &&
        !noData &&
        !rejected &&
        !malformed &&
        !late &&
        !incompleteListed &&
        !netMismatch
      if (!complete && !reason) {
        if (!responseSeen) reason = 'incomplete'
        else if (!evidence) reason = 'no_evidence'
      }
      if (!complete && !incompleteListed && !rejected && !noData) {
        touch(incompleteAccountIds, wanted)
      }
      return {
        positions,
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
        accountNetQuantity: accountNetSeen ? accountNet ?? undefined : undefined,
      }
    },
  }
}

export const MAX_INSTRUMENT_SNAPSHOT_AGE_MS = 30_000
/** Drain window after 403 so a late 450 is observed and refused, not omitted. */
export const SNAPSHOT_SETTLE_MS = 400

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
