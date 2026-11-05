import { RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
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
import {
  buildTradesFromRithmicFills,
  fillSide,
  fillTimestampMs,
  normalizeInstrument,
} from './fills-to-trades'

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

export type PreWindowCoverTrim = {
  accountId: string
  instrument: string
  side: 'B' | 'S'
  quantity: number
}

function signedFillSize(fill: RithmicProtocolFill): number {
  const quantity = Math.abs(Number(fill.fillSize) || 0)
  return fillSide(fill.transactionType) === 'B' ? quantity : -quantity
}

/**
 * Drop the opening prefix of extra buy or sell contracts when the fill stream
 * is net long/short.
 *
 * Lucid ShowFillHistory is a sliding window. A 2-lot long opened before
 * `historyStartDate` (or before the first window that returned rows) never
 * appears in the ledger, so the covering sells arrive first. FIFO then opens
 * phantom shorts and pairs them with later-session buys (multi-day holds).
 *
 * Only the prefix is trimmed, and only when FIFO from a flat book already
 * invented a multi-day round trip. Extra sells after a same-day flatten (a
 * live short) stay on the book as `openSkipped`. A balanced overnight hold
 * (net 0) is left alone.
 */
export function trimPreWindowOpeningCovers(
  fills: RithmicProtocolFill[],
): { fills: RithmicProtocolFill[]; trimmed: PreWindowCoverTrim[] } {
  if (fills.length === 0) return { fills, trimmed: [] }

  const groups = new Map<
    string,
    { accountId: string; instrument: string; items: Array<{ fill: RithmicProtocolFill; index: number }> }
  >()
  for (let index = 0; index < fills.length; index += 1) {
    const fill = fills[index]
    const accountId = fill.accountId || 'unknown'
    const instrument = normalizeInstrument(fill.symbol || '')
    const key = `${accountId}|${instrument}`
    const group = groups.get(key) ?? { accountId, instrument, items: [] }
    group.items.push({ fill, index })
    groups.set(key, group)
  }

  const imbalanced = [...groups.values()].filter((group) => {
    let net = 0
    for (const { fill } of group.items) net += signedFillSize(fill)
    return net !== 0
  })
  if (imbalanced.length === 0) return { fills, trimmed: [] }

  const { trades } = buildTradesFromRithmicFills(fills, '_trim', new Map())
  const overnightKeys = new Set(
    trades
      .filter(
        (trade) => trade.entryDate.slice(0, 10) !== trade.closeDate.slice(0, 10),
      )
      .map((trade) => `${trade.accountNumber}|${trade.instrument}`),
  )

  const remainingSize = new Map<number, number>()
  const trimmed: PreWindowCoverTrim[] = []

  for (const group of groups.values()) {
    const key = `${group.accountId}|${group.instrument}`
    if (!overnightKeys.has(key)) continue
    const sorted = [...group.items].sort((a, b) => {
      const byTime = fillTimestampMs(a.fill) - fillTimestampMs(b.fill)
      return byTime !== 0 ? byTime : a.index - b.index
    })
    let net = 0
    for (const { fill } of sorted) net += signedFillSize(fill)
    if (net === 0) continue

    const skipSide: 'B' | 'S' = net > 0 ? 'B' : 'S'
    let remaining = Math.abs(net)
    let dropped = 0
    for (const { fill, index } of sorted) {
      if (remaining <= 0) break
      if (fillSide(fill.transactionType) !== skipSide) break
      const quantity = Math.abs(Number(fill.fillSize) || 0)
      const take = Math.min(remaining, quantity)
      remaining -= take
      dropped += take
      remainingSize.set(index, quantity - take)
    }
    if (dropped > 0) {
      trimmed.push({
        accountId: group.accountId,
        instrument: group.instrument,
        side: skipSide,
        quantity: dropped,
      })
    }
  }

  if (trimmed.length === 0) return { fills, trimmed }

  const next: RithmicProtocolFill[] = []
  for (let index = 0; index < fills.length; index += 1) {
    if (!remainingSize.has(index)) {
      next.push(fills[index])
      continue
    }
    const quantity = remainingSize.get(index) ?? 0
    if (quantity <= 0) continue
    next.push({ ...fills[index], fillSize: quantity })
  }
  return { fills: next, trimmed }
}

/**
 * Run the plant-side collapse that FIFO expects: prefer settled history over
 * Replay twins, drop exact re-deliveries, merge split order pieces, then drop
 * unmatched opening covers from a lookback that started mid-position.
 */
export function prepareRithmicProtocolFills(
  fills: RithmicProtocolFill[],
): { fills: RithmicProtocolFill[]; stats: DedupeFillsStats } {
  const preferred = preferHistoryFills(fills)
  const deduped = dedupeFillsWithStats(preferred)
  const consolidated = consolidateOrderFills(deduped.fills)
  const trimmed = trimPreWindowOpeningCovers(consolidated)
  const coverQty = trimmed.trimmed.reduce((sum, row) => sum + row.quantity, 0)
  return {
    fills: trimmed.fills,
    stats: {
      received: fills.length,
      afterDedup: trimmed.fills.length,
      dropped: {
        ...deduped.stats.dropped,
        ...(coverQty > 0 ? { pre_window_covers: coverQty } : {}),
      },
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
    (tag) => tag && tag !== RITHMIC_PROTOCOL_TRADE_TAG,
  )
  return extraTags.length > 0
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
