import { RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
import type { RithmicProtocolFill } from './types'
import {
  canonicalRithmicFillId,
  consolidateOrderFills,
  dedupeFillsWithStats,
  fillDayKey,
  fillIdentityKey,
  preferHistoryFills,
  resolveRithmicProtocolPersistedId,
  RITHMIC_PROTOCOL_TIMESTAMP_TOLERANCE_MS,
  type DedupeFillsStats,
  type RithmicProtocolFillPairIdentity,
} from './dedupe-fills'
import { fillSide, fillTimestampMs, normalizeInstrument } from './fills-to-trades'

export type LedgerSeenIndex = {
  identityKeys: Set<string>
}

export type FillLedgerPartition = {
  inserts: RithmicProtocolFill[]
  updates: RithmicProtocolFill[]
  skipped: number
}

export type AnnotatedProtocolTrade = RithmicProtocolFillPairIdentity & {
  id: string
  comment?: string | null
  commentUndecryptable?: boolean
  tags?: string[] | null
  imageBase64?: string | null
  imageBase64Second?: string | null
  videoUrl?: string | null
  images?: string[] | null
  groupId?: string | null
}

export type FillLedgerNet = {
  accountId: string
  symbol: string
  instrument: string
  net: number
  fillCount: number
}

function signedFillSize(fill: RithmicProtocolFill): number {
  const quantity = Math.abs(Number(fill.fillSize) || 0)
  return fillSide(fill.transactionType) === 'B' ? quantity : -quantity
}

/**
 * Report per-contract net from fills. Does not rewrite the ledger.
 *
 * A non-zero net is ambiguous: a live position, a mid-window start, a
 * liquidation without a closing fill, and a mid-stream gap all look the same
 * from fills alone. Callers may flag the instrument; they must not drop or
 * resize fills without an explicit broker position snapshot.
 */
export function summarizeFillLedgerNets(
  fills: RithmicProtocolFill[],
): FillLedgerNet[] {
  const groups = new Map<string, FillLedgerNet>()
  for (const fill of fills) {
    const accountId = fill.accountId || 'unknown'
    const symbol = (fill.symbol || '').trim().toUpperCase()
    const key = `${accountId}|${symbol}`
    const group = groups.get(key) ?? {
      accountId,
      symbol,
      instrument: normalizeInstrument(symbol),
      net: 0,
      fillCount: 0,
    }
    group.net += signedFillSize(fill)
    group.fillCount += 1
    groups.set(key, group)
  }
  return [...groups.values()].filter((group) => group.net !== 0)
}

/**
 * Run the plant-side collapse that FIFO expects: prefer settled history over
 * Replay twins, drop exact re-deliveries, then merge split order pieces.
 *
 * Do not infer missing opening buys/sells from a terminal net. Fills cannot
 * tell a live short/long from a sliding-window start; rewriting them flips
 * P&L and hides open positions.
 */
export function prepareRithmicProtocolFills(
  fills: RithmicProtocolFill[],
): {
  fills: RithmicProtocolFill[]
  nearMisses: ManualFillNearMiss[]
  retirements: ManualFillRetirement[]
  stats: DedupeFillsStats
} {
  const active = fills.filter((fill) => fill.source !== 'manual-retired')
  const manuals = active.filter((fill) => fill.source === 'manual')
  const upstream = active.filter((fill) => fill.source !== 'manual')
  // Collapse plant fills first. A replay twin that history throws away must
  // not retire a manual patch, and split pieces must be one order before the
  // quantity check.
  const preferred = preferHistoryFills(upstream)
  const deduped = dedupeFillsWithStats(preferred)
  const consolidated = consolidateOrderFills(deduped.fills)
  const reconciled = reconcileManualFills(manuals, consolidated)
  return {
    fills: reconciled.fills,
    nearMisses: reconciled.nearMisses,
    retirements: reconciled.retirements,
    stats: {
      received: fills.length,
      afterDedup: deduped.fills.length,
      afterConsolidate: reconciled.fills.length,
      dropped: { ...deduped.stats.dropped },
    },
  }
}

export function buildLedgerSeenIndex(
  fills: RithmicProtocolFill[],
): LedgerSeenIndex {
  const identityKeys = new Set<string>()
  for (const fill of fills) identityKeys.add(fillIdentityKey(fill))
  return { identityKeys }
}

export function isFillAlreadyInLedger(
  fill: RithmicProtocolFill,
  seen: LedgerSeenIndex,
): boolean {
  return seen.identityKeys.has(fillIdentityKey(fill))
}

export function dropSeenLedgerFills(
  incoming: RithmicProtocolFill[],
  seen: LedgerSeenIndex,
): { novel: RithmicProtocolFill[]; skipped: number } {
  const novel: RithmicProtocolFill[] = []
  let skipped = 0
  for (const fill of incoming) {
    if (isFillAlreadyInLedger(fill, seen)) {
      skipped += 1
      continue
    }
    novel.push(fill)
  }
  return { novel, skipped }
}

/**
 * History is the settled record. Replace a stored replay twin when the same
 * identity later arrives from ShowFillHistory; keep stored history if replay
 * restates it. Prefer a row that actually has a clock. A manual patch is
 * never overwritten, and a manual row never replaces a plant fill.
 */
export function shouldReplaceStoredFill(
  stored: RithmicProtocolFill,
  incoming: RithmicProtocolFill,
): boolean {
  if (
    stored.source === 'manual' ||
    stored.source === 'manual-retired' ||
    incoming.source === 'manual' ||
    incoming.source === 'manual-retired'
  ) {
    return false
  }
  if (stored.source === 'history' && incoming.source === 'replay') return false
  if (stored.source === 'replay' && incoming.source === 'history') return true
  const storedClock = stored.ssboe ?? 0
  const incomingClock = incoming.ssboe ?? 0
  if (incomingClock > 0 && storedClock <= 0) return true
  return false
}

/**
 * Same execution as a manual patch: same account, symbol, side, quantity,
 * and price. The clock window covers the history/replay gap (seen up to
 * about 10s, allowed through 30s). Quantity is part of the match so a
 * 1-lot plant fill cannot retire a 2-lot patch; split pieces are summed
 * before this runs.
 */
export const MANUAL_FILL_UPSTREAM_MATCH_MS = 30_000

/** Same book and a close clock, but not an exact execution. Warn, do not drop. */
export const MANUAL_FILL_NEAR_MISS_MS = RITHMIC_PROTOCOL_TIMESTAMP_TOLERANCE_MS

function sameManualBook(
  manual: RithmicProtocolFill,
  upstream: RithmicProtocolFill,
): boolean {
  if (manual.source !== 'manual' || upstream.source === 'manual') return false
  if ((manual.accountId || '') !== (upstream.accountId || '')) return false
  const manualSymbol = (manual.symbol || '').trim().toUpperCase()
  const upstreamSymbol = (upstream.symbol || '').trim().toUpperCase()
  if (!manualSymbol || manualSymbol !== upstreamSymbol) return false
  return fillSide(manual.transactionType) === fillSide(upstream.transactionType)
}

function fillClockDeltaMs(
  manual: RithmicProtocolFill,
  upstream: RithmicProtocolFill,
): number | null {
  const manualMs = fillTimestampMs(manual)
  const upstreamMs = fillTimestampMs(upstream)
  if (!(manualMs > 0) || !(upstreamMs > 0)) return null
  return Math.abs(manualMs - upstreamMs)
}

function plantFillLacksClock(fill: RithmicProtocolFill): boolean {
  const noSsboe = !(typeof fill.ssboe === 'number' && fill.ssboe > 0)
  const noTime = !String(fill.fillTime ?? '').trim()
  return noSsboe && noTime
}

function confirmedDistinctFrom(
  manual: RithmicProtocolFill,
  upstream: RithmicProtocolFill,
): boolean {
  const marked = canonicalRithmicFillId(manual.confirmedDistinctFillId)
  const upstreamId = canonicalRithmicFillId(upstream.fillId)
  return Boolean(marked && upstreamId && marked === upstreamId)
}

export function manualFillMatchesUpstream(
  manual: RithmicProtocolFill,
  upstream: RithmicProtocolFill,
  toleranceMs = MANUAL_FILL_UPSTREAM_MATCH_MS,
): boolean {
  if (confirmedDistinctFrom(manual, upstream)) return false
  if (!sameManualBook(manual, upstream)) return false
  const manualQty = Math.abs(Number(manual.fillSize) || 0)
  const upstreamQty = Math.abs(Number(upstream.fillSize) || 0)
  if (!(manualQty > 0) || Math.abs(manualQty - upstreamQty) > 1e-6) return false
  const manualPrice = Number(manual.fillPrice || manual.avgFillPrice || 0)
  const upstreamPrice = Number(upstream.fillPrice || upstream.avgFillPrice || 0)
  if (!Number.isFinite(manualPrice) || !Number.isFinite(upstreamPrice)) return false
  if (Math.abs(manualPrice - upstreamPrice) > 1e-6) return false
  const delta = fillClockDeltaMs(manual, upstream)
  return delta != null && delta <= toleranceMs
}

function manualNearMissReason(
  manual: RithmicProtocolFill,
  upstream: RithmicProtocolFill,
): string | null {
  if (confirmedDistinctFrom(manual, upstream)) return null
  if (!sameManualBook(manual, upstream)) return null
  if (manualFillMatchesUpstream(manual, upstream)) return null
  if (isNextTradeDateClock(manual, upstream)) return 'day-offset'
  // A clockless plant row on this trade date or the next one would otherwise
  // be counted again. Rows further away do not block the book.
  if (plantFillLacksClock(upstream) && tradeDatesWithin(manual, upstream, 1)) {
    return 'no-clock'
  }
  const delta = fillClockDeltaMs(manual, upstream)
  if (delta == null || delta > MANUAL_FILL_NEAR_MISS_MS) return null
  const reasons: string[] = []
  const manualQty = Math.abs(Number(manual.fillSize) || 0)
  const upstreamQty = Math.abs(Number(upstream.fillSize) || 0)
  if (Math.abs(manualQty - upstreamQty) > 1e-6) reasons.push('qty')
  const manualPrice = Number(manual.fillPrice || manual.avgFillPrice || 0)
  const upstreamPrice = Number(upstream.fillPrice || upstream.avgFillPrice || 0)
  if (Math.abs(manualPrice - upstreamPrice) > 1e-6) reasons.push('price')
  if (delta > MANUAL_FILL_UPSTREAM_MATCH_MS) reasons.push('clock')
  return reasons.join('+') || 'clock'
}

/** Relation of one plant fill to a manual, ignoring a confirm-distinct marker. */
export function manualFillRelation(
  manual: RithmicProtocolFill,
  upstream: RithmicProtocolFill,
): { kind: 'exact' } | { kind: 'near-miss'; reason: string } | { kind: 'unrelated' } {
  const unmarked = { ...manual, confirmedDistinctFillId: undefined }
  if (manualFillMatchesUpstream(unmarked, upstream)) return { kind: 'exact' }
  const reason = manualNearMissReason(unmarked, upstream)
  if (reason) return { kind: 'near-miss', reason }
  return { kind: 'unrelated' }
}

export type ManualFillNearMiss = {
  manual: RithmicProtocolFill
  upstream: RithmicProtocolFill
  reason: string
}

export type ManualFillRetirement = {
  manual: RithmicProtocolFill
  upstream: RithmicProtocolFill
}

function yyyymmddUtc(day: string): number | null {
  if (!/^\d{8}$/.test(day)) return null
  return Date.UTC(
    Number(day.slice(0, 4)),
    Number(day.slice(4, 6)) - 1,
    Number(day.slice(6, 8)),
  )
}

function tradeDatesWithin(
  manual: RithmicProtocolFill,
  upstream: RithmicProtocolFill,
  days: number,
): boolean {
  const left = yyyymmddUtc(fillDayKey(manual))
  const right = yyyymmddUtc(fillDayKey(upstream))
  if (left == null || right == null) return false
  return Math.round(Math.abs(left - right) / 86_400_000) <= days
}

function clockOfDayDeltaMs(
  manual: RithmicProtocolFill,
  upstream: RithmicProtocolFill,
): number | null {
  const left = fillTimestampMs(manual)
  const right = fillTimestampMs(upstream)
  if (!(left > 0) || !(right > 0)) return null
  const day = 86_400_000
  const raw = Math.abs((left % day) - (right % day))
  return Math.min(raw, day - raw)
}

/** No ssboe, fill date is the next trade date, and the clock-of-day is close. */
function isNextTradeDateClock(
  manual: RithmicProtocolFill,
  upstream: RithmicProtocolFill,
): boolean {
  if (typeof upstream.ssboe === 'number' && upstream.ssboe > 0) return false
  if (!String(upstream.fillTime ?? '').trim()) return false
  const manualDay = yyyymmddUtc(fillDayKey(manual))
  const upstreamDay = yyyymmddUtc(fillDayKey(upstream))
  if (manualDay == null || upstreamDay == null) return false
  if (upstreamDay - manualDay !== 86_400_000) return false
  const clock = clockOfDayDeltaMs(manual, upstream)
  return clock != null && clock <= MANUAL_FILL_NEAR_MISS_MS
}

/**
 * Retire each manual against the already-consolidated upstream book.
 * One upstream fill retires at most one manual. Near misses are returned
 * so callers can refuse the rebuild and skip FIFO for that symbol.
 */
export function reconcileManualFills(
  manuals: RithmicProtocolFill[],
  consolidatedUpstream: RithmicProtocolFill[],
): {
  fills: RithmicProtocolFill[]
  nearMisses: ManualFillNearMiss[]
  retirements: ManualFillRetirement[]
} {
  if (manuals.length === 0) {
    return { fills: consolidatedUpstream, nearMisses: [], retirements: [] }
  }
  const used = new Set<RithmicProtocolFill>()
  const kept: RithmicProtocolFill[] = []
  const nearMisses: ManualFillNearMiss[] = []
  const retirements: ManualFillRetirement[] = []
  const ordered = [...manuals].sort(
    (left, right) => fillTimestampMs(left) - fillTimestampMs(right),
  )
  for (const manual of ordered) {
    let best: RithmicProtocolFill | undefined
    let bestDt = Number.POSITIVE_INFINITY
    for (const candidate of consolidatedUpstream) {
      if (used.has(candidate)) continue
      if (!manualFillMatchesUpstream(manual, candidate)) continue
      const delta = fillClockDeltaMs(manual, candidate) ?? Number.POSITIVE_INFINITY
      if (delta < bestDt) {
        best = candidate
        bestDt = delta
      }
    }
    if (best) {
      used.add(best)
      retirements.push({ manual, upstream: best })
      console.info(
        `[RITHMIC-MANUAL-FILL] preferring upstream fillId=${best.fillId ?? ''} over manual fillId=${manual.fillId ?? ''} account=${manual.accountId} symbol=${(manual.symbol || '').trim().toUpperCase()} dtMs=${bestDt}`,
      )
      continue
    }
    kept.push(manual)
    let near: RithmicProtocolFill | undefined
    let nearReason = ''
    let nearDt = Number.POSITIVE_INFINITY
    for (const candidate of consolidatedUpstream) {
      const delta = fillClockDeltaMs(manual, candidate) ?? Number.POSITIVE_INFINITY
      if (manualFillMatchesUpstream(manual, candidate) && used.has(candidate)) {
        if (delta < nearDt) {
          near = candidate
          nearReason = 'already-matched'
          nearDt = delta
        }
        continue
      }
      const reason = manualNearMissReason(manual, candidate)
      if (!reason) continue
      if (delta < nearDt) {
        near = candidate
        nearReason = reason
        nearDt = delta
      }
    }
    if (near) {
      nearMisses.push({ manual, upstream: near, reason: nearReason })
      console.warn(
        `[RITHMIC-MANUAL-FILL] near-miss manual fillId=${manual.fillId ?? ''} upstream fillId=${near.fillId ?? ''} account=${manual.accountId} symbol=${(manual.symbol || '').trim().toUpperCase()} reason=${nearReason} dtMs=${nearDt}`,
      )
    }
  }
  return { fills: [...consolidatedUpstream, ...kept], nearMisses, retirements }
}

export function planManualFillSyncEffects(prepared: {
  fills: RithmicProtocolFill[]
  nearMisses: ManualFillNearMiss[]
  retirements: ManualFillRetirement[]
}): {
  fifoFills: RithmicProtocolFill[]
  droppedByReason: Record<string, number>
  retainAccountNumbers: string[]
} {
  const fifoFills = omitAmbiguousManualBooks(prepared.fills, prepared.nearMisses)
  const ambiguousSkipped = prepared.fills.length - fifoFills.length
  const droppedByReason: Record<string, number> = {}
  if (ambiguousSkipped > 0) droppedByReason.manual_fill_ambiguous = ambiguousSkipped
  if (prepared.retirements.length > 0) {
    droppedByReason.manual_fill_superseded = prepared.retirements.length
  }
  return {
    fifoFills,
    droppedByReason,
    retainAccountNumbers: [
      ...new Set(prepared.nearMisses.map((miss) => miss.manual.accountId)),
    ],
  }
}

export function manualFillBookKey(fill: { accountId: string; symbol: string }): string {
  return `${fill.accountId}|${(fill.symbol || '').trim().toUpperCase()}`
}

/** Drop every fill on a book that has a manual near-miss so FIFO cannot count both. */
export function omitAmbiguousManualBooks(
  fills: RithmicProtocolFill[],
  nearMisses: ManualFillNearMiss[],
): RithmicProtocolFill[] {
  if (nearMisses.length === 0) return fills
  const blocked = new Set(nearMisses.map((miss) => manualFillBookKey(miss.manual)))
  return fills.filter((fill) => !blocked.has(manualFillBookKey(fill)))
}

/** @deprecated Use reconcileManualFills on the consolidated upstream book. */
export function preferUpstreamOverMatchingManualFills(
  fills: RithmicProtocolFill[],
): RithmicProtocolFill[] {
  const manuals = fills.filter((fill) => fill.source === 'manual')
  const upstream = fills.filter((fill) => fill.source !== 'manual')
  const preferred = preferHistoryFills(upstream)
  const deduped = dedupeFillsWithStats(preferred)
  const consolidated = consolidateOrderFills(deduped.fills)
  return reconcileManualFills(manuals, consolidated).fills
}

export function mergeFillLedgers(
  stored: RithmicProtocolFill[],
  incoming: RithmicProtocolFill[],
): RithmicProtocolFill[] {
  const byKey = new Map<string, RithmicProtocolFill>()
  for (const fill of stored) byKey.set(fillIdentityKey(fill), fill)
  for (const fill of incoming) {
    const key = fillIdentityKey(fill)
    const existing = byKey.get(key)
    if (!existing || shouldReplaceStoredFill(existing, fill)) {
      byKey.set(key, fill)
    }
  }
  // Identity merge only. Retirement happens in prepare, against the
  // consolidated plant book, so a replay twin cannot retire a manual fill
  // and then be dropped itself.
  return [...byKey.values()]
}

export function partitionIncomingFills(
  incoming: RithmicProtocolFill[],
  stored: RithmicProtocolFill[],
): FillLedgerPartition {
  const storedByKey = new Map(
    stored.map((fill) => [fillIdentityKey(fill), fill] as const),
  )
  const inserts: RithmicProtocolFill[] = []
  const updates: RithmicProtocolFill[] = []
  let skipped = 0
  const seenIncoming = new Set<string>()
  for (const fill of incoming) {
    const key = fillIdentityKey(fill)
    if (seenIncoming.has(key)) {
      skipped += 1
      continue
    }
    seenIncoming.add(key)
    const existing = storedByKey.get(key)
    if (!existing) {
      inserts.push(fill)
      continue
    }
    if (shouldReplaceStoredFill(existing, fill)) {
      updates.push(fill)
      continue
    }
    skipped += 1
  }
  return { inserts, updates, skipped }
}

export type RebuildTradeRef = {
  id: string
  instrument?: string | null
  entryId?: string | null
  closeId?: string | null
  pnl?: number
}

/**
 * Stored protocol trades whose entry or close fill is missing from the
 * merged ledger. A sliding ShowFillHistory window can leave those legs
 * out; deleting the row and reporting success would drop history the
 * rebuild cannot recreate.
 */
export function uncoveredProtocolTrades<T extends RebuildTradeRef>(
  existing: T[],
  ledgerFillIds: Set<string>,
): T[] {
  return existing.filter((row) => {
    const entryId = canonicalRithmicFillId(row.entryId)
    const closeId = canonicalRithmicFillId(row.closeId)
    if (!entryId || !closeId) return true
    return !ledgerFillIds.has(entryId) || !ledgerFillIds.has(closeId)
  })
}

export function duplicateRebuildTradeIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id)
    else seen.add(id)
  }
  return [...duplicates]
}

export function canonicalLedgerFillIds(
  fills: RithmicProtocolFill[],
): Set<string> {
  const ids = new Set<string>()
  for (const fill of fills) {
    const fillId = canonicalRithmicFillId(fill.fillId)
    if (fillId) ids.add(fillId)
  }
  return ids
}

export function retiredManualFillIds(
  fills: Array<{ source?: string | null; fillId?: string | null }>,
): Set<string> {
  const ids = new Set<string>()
  for (const fill of fills) {
    if (fill.source !== 'manual-retired') continue
    const fillId = canonicalRithmicFillId(fill.fillId)
    if (fillId) ids.add(fillId)
  }
  return ids
}

export function tradeReferencesFillId(
  trade: { entryId?: string | null; closeId?: string | null },
  fillId: string,
): boolean {
  const target = canonicalRithmicFillId(fillId)
  if (!target) return false
  const entry = canonicalRithmicFillId(trade.entryId)
  const close = canonicalRithmicFillId(trade.closeId)
  return entry === target || close === target
}

/** Annotated trades still pointing at a retired manual fill. Ordinary sync reports these and does not delete them. */
export function countRetiredManualTradesKept(params: {
  existing: AnnotatedProtocolTrade[]
  derived: Array<{ id: string } & RithmicProtocolFillPairIdentity>
  ledgerFillIds: Set<string>
  retiredFillIds: Set<string>
}): number {
  if (params.retiredFillIds.size === 0) return 0
  let kept = 0
  for (const row of params.existing) {
    const entry = canonicalRithmicFillId(row.entryId)
    const close = canonicalRithmicFillId(row.closeId)
    const references =
      (entry != null && params.retiredFillIds.has(entry)) ||
      (close != null && params.retiredFillIds.has(close))
    if (!references || !hasTradeJournalAnnotations(row)) continue
    if (classifyStoredProtocolTrade(row, params) === 'keep') kept += 1
  }
  return kept
}

export function hasTradeJournalAnnotations(
  trade: AnnotatedProtocolTrade,
): boolean {
  if (trade.commentUndecryptable) return true
  if (trade.comment?.trim()) return true
  if (trade.imageBase64) return true
  if (trade.imageBase64Second) return true
  if (trade.videoUrl) return true
  if ((trade.images?.length ?? 0) > 0) return true
  if (trade.groupId?.trim()) return true
  const extraTags = (trade.tags ?? []).filter(
    (tag) => tag && tag !== RITHMIC_PROTOCOL_TRADE_TAG,
  )
  return extraTags.length > 0
}

export type ReattachedProtocolTrades<
  T extends RithmicProtocolFillPairIdentity & {
    id: string
    tags?: string[] | null
  },
> = {
  trades: Array<T & Partial<AnnotatedProtocolTrade>>
  preserved: number
  unmatched: AnnotatedProtocolTrade[]
}

/**
 * Copy journal fields onto rebuilt protocol trades matched by fill-pair
 * identity. Unmatched annotated rows are returned so a rebuild can refuse
 * instead of dropping notes.
 */
export function reattachProtocolTradeAnnotations<
  T extends RithmicProtocolFillPairIdentity & {
    id: string
    tags?: string[] | null
  },
>(
  derived: T[],
  existing: AnnotatedProtocolTrade[],
): ReattachedProtocolTrades<T> {
  const usedExisting = new Set<string>()
  const trades: Array<T & Partial<AnnotatedProtocolTrade>> = derived.map((trade) => {
    const existingId = resolveRithmicProtocolPersistedId(trade, existing)
    if (!existingId) return trade
    const row = existing.find((item) => item.id === existingId)
    if (!row) return trade
    usedExisting.add(row.id)
    if (!hasTradeJournalAnnotations(row)) {
      return { ...trade, id: row.id }
    }
    const extraTags = (row.tags ?? []).filter(
      (tag) => tag && tag !== RITHMIC_PROTOCOL_TRADE_TAG,
    )
    return {
      ...trade,
      id: row.id,
      comment: row.comment,
      imageBase64: row.imageBase64,
      imageBase64Second: row.imageBase64Second,
      videoUrl: row.videoUrl,
      images: row.images,
      groupId: row.groupId,
      tags: [...new Set([...(trade.tags ?? []), ...extraTags])],
    }
  })
  const unmatched = existing.filter(
    (row) => hasTradeJournalAnnotations(row) && !usedExisting.has(row.id),
  )
  return {
    trades,
    preserved: existing.filter(
      (row) => usedExisting.has(row.id) && hasTradeJournalAnnotations(row),
    ).length,
    unmatched,
  }
}

export function protocolTradeJournalFingerprint(
  row: Pick<
    AnnotatedProtocolTrade,
    | 'comment'
    | 'imageBase64'
    | 'imageBase64Second'
    | 'videoUrl'
    | 'images'
    | 'groupId'
    | 'tags'
  >,
): string {
  const extraTags = [...(row.tags ?? [])]
    .filter((tag) => tag && tag !== RITHMIC_PROTOCOL_TRADE_TAG)
    .sort()
  return JSON.stringify({
    comment: row.comment ?? null,
    imageBase64: row.imageBase64 ?? null,
    imageBase64Second: row.imageBase64Second ?? null,
    videoUrl: row.videoUrl ?? null,
    images: row.images ?? [],
    groupId: row.groupId ?? '',
    extraTags,
  })
}

export function protocolTradeSetsMatch(
  left: Array<{ id: string } & Partial<AnnotatedProtocolTrade>>,
  right: Array<{ id: string } & Partial<AnnotatedProtocolTrade>>,
): boolean {
  if (left.length !== right.length) return false
  const rightById = new Map(right.map((row) => [row.id, row]))
  return left.every((row) => {
    const other = rightById.get(row.id)
    if (!other) return false
    return (
      protocolTradeJournalFingerprint(row) === protocolTradeJournalFingerprint(other)
    )
  })
}

/**
 * Protocol trades whose fill pair is no longer produced by FIFO on the
 * ledger, but whose legs are both in the ledger — leftover overnight
 * phantoms from a lossy trades-only snapshot. Annotated rows are kept.
 */
export function phantomProtocolTradeIds(params: {
  existing: AnnotatedProtocolTrade[]
  derived: Array<{ id: string } & RithmicProtocolFillPairIdentity>
  ledgerFillIds: Set<string>
}): string[] {
  const toDelete: string[] = []
  for (const row of params.existing) {
    if (classifyStoredProtocolTrade(row, params) === 'reap') toDelete.push(row.id)
  }
  return toDelete
}

/**
 * `rematch` is the replaced branch: a plant trade took over this manual-id
 * row, so the row stays (annotations included) and is not inserted again.
 * `reap` deletes an unannotated leftover. `keep` leaves every other row.
 */
export function classifyStoredProtocolTrade(
  row: AnnotatedProtocolTrade,
  params: {
    derived: Array<{ id: string } & RithmicProtocolFillPairIdentity>
    ledgerFillIds: Set<string>
    distinctPlantIdByManualFillId?: ReadonlyMap<string, string>
  },
): 'rematch' | 'reap' | 'keep' {
  const replaced = params.derived.some((incoming) =>
    manualTradeReplacedByPlantTrade(row, incoming, {
      derivedBatch: params.derived,
      distinctPlantIdByManualFillId: params.distinctPlantIdByManualFillId,
    }),
  )
  if (replaced) return 'rematch'
  if (hasTradeJournalAnnotations(row)) return 'keep'
  const matched = params.derived.some(
    (incoming) => resolveRithmicProtocolPersistedId(incoming, [row]) === row.id,
  )
  if (matched) return 'keep'
  const entryId = canonicalRithmicFillId(row.entryId)
  const closeId = canonicalRithmicFillId(row.closeId)
  if (!entryId || !closeId) return 'keep'
  if (!params.ledgerFillIds.has(entryId) || !params.ledgerFillIds.has(closeId)) {
    return 'keep'
  }
  return 'reap'
}

function isManualProtocolFillId(id: string | null | undefined): boolean {
  const canonical = canonicalRithmicFillId(id)
  return Boolean(canonical?.startsWith('manual-'))
}

function tradeClockMs(value: string | null | undefined): number | null {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : ms
}

export type ManualReplacementContext = {
  /** Derived trades in this sync. A manual leg still present is not a replacement. */
  derivedBatch?: ReadonlyArray<{ entryId?: string | null; closeId?: string | null }>
  /** Manual fill id → plant fill id an admin confirmed is a different execution. */
  distinctPlantIdByManualFillId?: ReadonlyMap<string, string>
}

function manualLegIds(trade: {
  entryId?: string | null
  closeId?: string | null
}): string[] {
  const ids: string[] = []
  const entry = canonicalRithmicFillId(trade.entryId)
  const close = canonicalRithmicFillId(trade.closeId)
  if (isManualProtocolFillId(entry)) ids.push(entry!)
  if (isManualProtocolFillId(close) && close !== entry) ids.push(close!)
  return ids
}

function batchStillCarriesManualLeg(
  stored: { entryId?: string | null; closeId?: string | null },
  context: ManualReplacementContext | undefined,
): boolean {
  const legs = manualLegIds(stored)
  if (legs.length === 0 || !context?.derivedBatch) return false
  return context.derivedBatch.some((trade) => {
    const entry = canonicalRithmicFillId(trade.entryId)
    const close = canonicalRithmicFillId(trade.closeId)
    return legs.some((leg) => leg === entry || leg === close)
  })
}

function markedDistinctFromPlant(
  stored: { entryId?: string | null; closeId?: string | null },
  derived: { entryId?: string | null; closeId?: string | null },
  context: ManualReplacementContext | undefined,
): boolean {
  const map = context?.distinctPlantIdByManualFillId
  if (!map || map.size === 0) return false
  const storedEntry = canonicalRithmicFillId(stored.entryId)
  const storedClose = canonicalRithmicFillId(stored.closeId)
  const derivedEntry = canonicalRithmicFillId(derived.entryId)
  const derivedClose = canonicalRithmicFillId(derived.closeId)
  const plantIds = [derivedEntry, derivedClose].filter(
    (id): id is string => Boolean(id) && !isManualProtocolFillId(id),
  )
  return manualLegIds(stored).some((leg) => {
    const marked = map.get(leg)
    if (!marked) return false
    if (leg === storedEntry && derivedEntry && marked === derivedEntry) return true
    if (leg === storedClose && derivedClose && marked === derivedClose) return true
    return plantIds.includes(marked)
  })
}

/** Stored round-trip used a manual leg; the derived trade is the plant fill that replaced it. */
export function manualTradeReplacedByPlantTrade(
  stored: RithmicProtocolFillPairIdentity & {
    side?: string | null
    quantity?: number | null
    entryPrice?: string | number | null
    closePrice?: string | number | null
  },
  derived: RithmicProtocolFillPairIdentity & {
    side?: string | null
    quantity?: number | null
    entryPrice?: string | number | null
    closePrice?: string | number | null
  },
  context?: ManualReplacementContext,
): boolean {
  const storedEntry = canonicalRithmicFillId(stored.entryId)
  const storedClose = canonicalRithmicFillId(stored.closeId)
  const derivedEntry = canonicalRithmicFillId(derived.entryId)
  const derivedClose = canonicalRithmicFillId(derived.closeId)
  if (!storedEntry || !storedClose || !derivedEntry || !derivedClose) return false
  const entryManual = isManualProtocolFillId(storedEntry)
  const closeManual = isManualProtocolFillId(storedClose)
  if (!entryManual && !closeManual) return false
  if ((stored.accountNumber ?? '') !== (derived.accountNumber ?? '')) return false
  if ((stored.instrument ?? '') !== (derived.instrument ?? '')) return false
  if (
    stored.quantity != null &&
    derived.quantity != null &&
    Number(stored.quantity) !== Number(derived.quantity)
  ) {
    return false
  }
  if (
    stored.side &&
    derived.side &&
    stored.side.toLowerCase() !== derived.side.toLowerCase()
  ) {
    return false
  }
  const entryPrice = Number(stored.entryPrice)
  const derivedEntryPrice = Number(derived.entryPrice)
  const closePrice = Number(stored.closePrice)
  const derivedClosePrice = Number(derived.closePrice)
  if (
    Number.isFinite(entryPrice) &&
    Number.isFinite(derivedEntryPrice) &&
    Math.abs(entryPrice - derivedEntryPrice) > 1e-6
  ) {
    return false
  }
  if (
    Number.isFinite(closePrice) &&
    Number.isFinite(derivedClosePrice) &&
    Math.abs(closePrice - derivedClosePrice) > 1e-6
  ) {
    return false
  }
  const entryDt = clockDelta(stored.entryDate, derived.entryDate)
  const closeDt = clockDelta(stored.closeDate, derived.closeDate)
  if (entryDt == null || closeDt == null) return false
  if (entryDt > MANUAL_FILL_NEAR_MISS_MS || closeDt > MANUAL_FILL_NEAR_MISS_MS) {
    return false
  }
  if (!entryManual && storedEntry !== derivedEntry) return false
  if (!closeManual && storedClose !== derivedClose) return false
  if (entryManual && storedEntry === derivedEntry && closeManual && storedClose === derivedClose) {
    return false
  }
  if (!(entryManual || closeManual)) return false
  if (
    context &&
    (batchStillCarriesManualLeg(stored, context) ||
      markedDistinctFromPlant(stored, derived, context))
  ) {
    return false
  }
  return true
}

function clockDelta(
  left: string | null | undefined,
  right: string | null | undefined,
): number | null {
  const leftMs = tradeClockMs(left)
  const rightMs = tradeClockMs(right)
  if (leftMs == null || rightMs == null) return null
  return Math.abs(leftMs - rightMs)
}

export function deriveTradesFromFillLedger(
  stored: RithmicProtocolFill[],
  incoming: RithmicProtocolFill[],
): {
  fills: RithmicProtocolFill[]
  nearMisses: ManualFillNearMiss[]
  retirements: ManualFillRetirement[]
  stats: DedupeFillsStats
} {
  return prepareRithmicProtocolFills(mergeFillLedgers(stored, incoming))
}

/**
 * Plant round-trip that replaced a manual leg. Callers assign the stored
 * row id so the annotation stays and a second trade is not inserted.
 */
export function resolvePersistedProtocolTradeId(
  incoming: RithmicProtocolFillPairIdentity & {
    side?: string | null
    quantity?: number | null
    entryPrice?: string | number | null
    closePrice?: string | number | null
  },
  existingRows: Array<
    { id: string } & RithmicProtocolFillPairIdentity & {
      side?: string | null
      quantity?: number | null
      entryPrice?: string | number | null
      closePrice?: string | number | null
    }
  >,
): string | undefined {
  const direct = resolveRithmicProtocolPersistedId(incoming, existingRows)
  if (direct) return direct
  for (const row of existingRows) {
    if (manualTradeReplacedByPlantTrade(row, incoming)) return row.id
  }
  return undefined
}
