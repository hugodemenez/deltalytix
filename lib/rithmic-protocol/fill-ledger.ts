import { isOpeningSeedOrderId, isProtocolSystemTag } from './opening-position'
import type { RithmicProtocolFill } from './types'
import {
  canonicalRithmicFillId,
  consolidateOrderFills,
  dedupeFillsWithStats,
  fillIdentityKey,
  preferHistoryFills,
  resolveRithmicProtocolPersistedId,
  type DedupeFillsStats,
  type RithmicProtocolFillPairIdentity,
} from './dedupe-fills'
import { fillSide, normalizeInstrument } from './fills-to-trades'

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
): { fills: RithmicProtocolFill[]; stats: DedupeFillsStats } {
  const preferred = preferHistoryFills(fills)
  const deduped = dedupeFillsWithStats(preferred)
  const consolidated = consolidateOrderFills(deduped.fills)
  return {
    fills: consolidated,
    stats: {
      received: fills.length,
      afterDedup: deduped.fills.length,
      afterConsolidate: consolidated.length,
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
 * restates it. Prefer a row that actually has a clock.
 */
export function shouldReplaceStoredFill(
  stored: RithmicProtocolFill,
  incoming: RithmicProtocolFill,
): boolean {
  if (stored.source === 'history' && incoming.source === 'replay') return false
  if (stored.source === 'replay' && incoming.source === 'history') return true
  const storedClock = stored.ssboe ?? 0
  const incomingClock = incoming.ssboe ?? 0
  if (incomingClock > 0 && storedClock <= 0) return true
  return false
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
    const closeId = canonicalRithmicFillId(row.closeId)
    if (isOpeningSeedOrderId(row.entryId)) {
      if (!closeId) return true
      return !ledgerFillIds.has(closeId)
    }
    const entryId = canonicalRithmicFillId(row.entryId)
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

export function hasTradeJournalAnnotations(
  trade: AnnotatedProtocolTrade,
): boolean {
  if (trade.comment?.trim()) return true
  if (trade.imageBase64) return true
  if (trade.imageBase64Second) return true
  if (trade.videoUrl) return true
  if ((trade.images?.length ?? 0) > 0) return true
  if (trade.groupId?.trim()) return true
  const extraTags = (trade.tags ?? []).filter(
    (tag) => tag && !isProtocolSystemTag(tag),
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
      (tag) => tag && !isProtocolSystemTag(tag),
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
    .filter((tag) => tag && !isProtocolSystemTag(tag))
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
  const matchedExistingIds = new Set<string>()
  for (const incoming of params.derived) {
    const existingId = resolveRithmicProtocolPersistedId(
      incoming,
      params.existing,
    )
    if (existingId) matchedExistingIds.add(existingId)
  }

  const toDelete: string[] = []
  for (const row of params.existing) {
    if (matchedExistingIds.has(row.id)) continue
    if (hasTradeJournalAnnotations(row)) continue
    const entryId = canonicalRithmicFillId(row.entryId)
    const closeId = canonicalRithmicFillId(row.closeId)
    if (!entryId || !closeId) continue
    if (!params.ledgerFillIds.has(entryId) || !params.ledgerFillIds.has(closeId)) {
      continue
    }
    toDelete.push(row.id)
  }
  return toDelete
}

export function deriveTradesFromFillLedger(
  stored: RithmicProtocolFill[],
  incoming: RithmicProtocolFill[],
): { fills: RithmicProtocolFill[]; stats: DedupeFillsStats } {
  return prepareRithmicProtocolFills(mergeFillLedgers(stored, incoming))
}
