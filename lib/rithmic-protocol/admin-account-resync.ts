import 'server-only'
import { revalidateTag, updateTag } from 'next/cache'
import type { Trade } from '@/prisma/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { decryptConnectionToken } from '@/lib/connection-token-crypto'
import { generatePersistedTradeUUID, RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
import {
  fetchFillsForAccounts,
  fetchInstrumentPositions,
} from '@/lib/rithmic-protocol/client'
import {
  gatewayUri as gatewayUriFor,
  resolveGateway,
} from '@/lib/rithmic-protocol/systems'
import { scopeProtocolAccountIds } from './scope-accounts'
import {
  ProtocolSyncLockError,
  protocolAccountLockKeys,
  withProtocolSyncLock,
} from './sync-lock'
import {
  loadRithmicProtocolFills,
  upsertRithmicProtocolFills,
} from './fill-ledger-store'
import {
  type AnnotatedProtocolTrade,
  type FillLedgerNet,
  type RebuildTradeRef,
  canonicalLedgerFillIds,
  duplicateRebuildTradeIds,
  mergeFillLedgers,
  partitionIncomingFills,
  prepareRithmicProtocolFills,
  protocolTradeSetsMatch,
  reattachProtocolTradeAnnotations,
  summarizeFillLedgerNets,
  uncoveredProtocolTrades,
} from './fill-ledger'
import { buildTradesFromRithmicFills, normalizeFillAccountId } from './fills-to-trades'
import {
  type OpeningPositionCheck,
  computeOpeningPositionChecks,
  decideOpeningSeeds,
  fifoEndPositionMatchesPEnd,
  openingPositionKey,
  pinFifoAnchorMs,
  reconcileBracketedSnapshots,
  indexFillsByCanonicalId,
  tradeClosedOnOrAfter,
  tradeTouchesSymbolKeys,
  utcYyyymmddStartMs,
} from './opening-position'
import type { RithmicProtocolFill } from './types'

const SERVICE = 'rithmic-protocol'
const ANNOTATION_SELECT = {
  id: true,
  accountNumber: true,
  instrument: true,
  entryDate: true,
  closeDate: true,
  entryId: true,
  closeId: true,
  pnl: true,
  comment: true,
  tags: true,
  imageBase64: true,
  imageBase64Second: true,
  videoUrl: true,
  images: true,
  groupId: true,
} as const

const DEFAULT_LOOKBACK_DAYS = Math.max(
  1,
  Number(process.env.RITHMIC_PROTOCOL_HISTORY_LOOKBACK_DAYS ?? '30'),
)

export type AccountProtocolSnapshot = {
  tradeCount: number
  pnl: number
  fillCount: number
}

export type RebuildTradePreview = RebuildTradeRef & { pnl: number }

export type FillHistoryWindow = {
  requestedStartYmd?: string
  anchoredStartYmd?: string
  weeklyCloseIso?: string
  endYmd?: string
  complete?: boolean
  windowsFailed?: number
  incompleteAccountIds?: string[]
}

export type ProposedRebuildSnapshot = AccountProtocolSnapshot & {
  openSkipped: number
  annotatedPreserved: number
  unmatchedAnnotations: number
  nets: FillLedgerNet[]
  positionChecks: OpeningPositionCheck[]
  snapshotStatus: 'ok' | 'unavailable'
  snapshotReason?: string
  fillWindow?: FillHistoryWindow
  seededOpeningLots: number
  ledgerRowsAfterMerge: number
  consolidatedFills: number
  fillsInserted: number
  fillsUpdated: number
  tradesDeleted: number
  tradesCreated: number
  tradesKept: number
  uncoveredTrades: RebuildTradePreview[]
  unmatchedAnnotatedTrades: RebuildTradePreview[]
}

export type AdminAccountResyncResult = {
  dryRun: boolean
  complete: boolean
  userId: string
  accountNumber: string
  before: AccountProtocolSnapshot
  wouldDelete?: AccountProtocolSnapshot
  proposed?: ProposedRebuildSnapshot
  warnings?: string[]
  deleted?: { trades: number; fills: number }
  after?: AccountProtocolSnapshot & {
    savedCount: number
    tradesCount: number
  }
  committed?: boolean
  error?: string
  connectionIds?: string[]
}

type StoredCredentials = {
  username: string
  password: string
  systemName: string
  gatewayId?: string
  gatewayUri: string
  accountIds?: string[]
  accounts?: Array<{ accountId: string; fcmId?: string; ibId?: string }>
  fcmId?: string
  ibId?: string
  historyStartDate?: string
  fifoAnchorIso?: string
}

type ProtocolDb = typeof prisma

type ExistingProtocolTrade = AnnotatedProtocolTrade & {
  pnl: number
  entryDate?: string | null
  closeDate?: string | null
}

class AdminApplyError extends Error {
  constructor(
    public readonly code: 'CONCURRENT_SYNC' | 'INSERT_MISMATCH',
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'AdminApplyError'
  }
}

function parseAccountIds(tokenJson: string): string[] {
  try {
    const parsed = JSON.parse(tokenJson) as { accountIds?: unknown }
    if (!Array.isArray(parsed.accountIds)) return []
    return parsed.accountIds.filter(
      (id): id is string => typeof id === 'string' && id.length > 0,
    )
  } catch {
    return []
  }
}

function parseStoredCredentials(tokenJson: string): StoredCredentials | null {
  try {
    const parsed = JSON.parse(tokenJson) as StoredCredentials
    if (!parsed.username || !parsed.password || !parsed.systemName) {
      return null
    }
    const gateway = resolveGateway(parsed.gatewayId ?? parsed.gatewayUri)
    return {
      ...parsed,
      gatewayId: gateway.id,
      gatewayUri: gatewayUriFor(gateway),
    }
  } catch {
    return null
  }
}

export async function summarizeAccountProtocolData(
  userId: string,
  accountNumber: string,
  db: ProtocolDb = prisma,
): Promise<AccountProtocolSnapshot> {
  const [trades, fillCount] = await Promise.all([
    db.trade.findMany({
      where: {
        userId,
        accountNumber,
        tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
      },
      select: { pnl: true },
    }),
    db.rithmicProtocolFill.count({
      where: { userId, accountNumber },
    }),
  ])
  return {
    tradeCount: trades.length,
    pnl: trades.reduce((sum, trade) => sum + trade.pnl, 0),
    fillCount,
  }
}

async function loadExistingProtocolTrades(
  userId: string,
  accountNumber: string,
  db: ProtocolDb = prisma,
): Promise<ExistingProtocolTrade[]> {
  return db.trade.findMany({
    where: {
      userId,
      accountNumber,
      tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
    },
    select: ANNOTATION_SELECT,
  }) as Promise<ExistingProtocolTrade[]>
}

async function loadConnectionForAccount(params: {
  userId: string
  accountNumber: string
  connectionId?: string
}): Promise<
  | { connectionId: string; storedTokenJson: string; accountIds: string[] }
  | {
      error:
        | 'NO_TOKEN_RECONNECT'
        | 'ACCOUNT_NOT_ON_CONNECTION'
        | 'AMBIGUOUS_CONNECTION'
        | 'TOKEN_DECRYPT_FAILED'
      connectionIds?: string[]
    }
> {
  const connections = await prisma.connection.findMany({
    where: { userId: params.userId, service: SERVICE },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      token: true,
      accounts: { select: { number: true } },
    },
  })
  if (connections.length === 0) {
    return { error: 'NO_TOKEN_RECONNECT' }
  }

  const matches: Array<{
    connectionId: string
    storedTokenJson: string
    accountIds: string[]
  }> = []
  let decryptFailures = 0
  let tokenBearing = 0

  for (const connection of connections) {
    if (params.connectionId && connection.id !== params.connectionId) continue
    if (!connection.token) continue
    tokenBearing += 1
    let storedTokenJson: string | null
    try {
      storedTokenJson = decryptConnectionToken(connection.token)
    } catch {
      decryptFailures += 1
      continue
    }
    if (!storedTokenJson) {
      decryptFailures += 1
      continue
    }
    const fromToken = parseAccountIds(storedTokenJson)
    const fromRows = connection.accounts.map((account) => account.number)
    const available = [...new Set([...fromToken, ...fromRows])]
    const scoped = scopeProtocolAccountIds(available, [params.accountNumber])
    if ('error' in scoped) continue
    matches.push({
      connectionId: connection.id,
      storedTokenJson,
      accountIds: scoped.accountIds,
    })
  }

  if (params.connectionId && matches.length === 0) {
    if (decryptFailures > 0) return { error: 'TOKEN_DECRYPT_FAILED' }
    return { error: 'ACCOUNT_NOT_ON_CONNECTION' }
  }
  if (matches.length === 0) {
    if (tokenBearing > 0 && decryptFailures === tokenBearing) {
      return { error: 'TOKEN_DECRYPT_FAILED' }
    }
    return { error: 'ACCOUNT_NOT_ON_CONNECTION' }
  }
  if (matches.length > 1) {
    return {
      error: 'AMBIGUOUS_CONNECTION',
      connectionIds: matches.map((match) => match.connectionId),
    }
  }
  return matches[0]
}

function earliestFillClock(fills: RithmicProtocolFill[]): number | null {
  let earliest: number | null = null
  for (const fill of fills) {
    const clock = fill.ssboe ?? 0
    if (clock <= 0) continue
    if (earliest == null || clock < earliest) earliest = clock
  }
  return earliest
}

function earliestTradeClock(trades: ExistingProtocolTrade[]): number | null {
  let earliest: number | null = null
  for (const trade of trades) {
    for (const value of [trade.entryDate, trade.closeDate]) {
      if (!value) continue
      const parsed = Date.parse(value)
      if (!Number.isFinite(parsed)) continue
      const clock = Math.floor(parsed / 1000)
      if (clock <= 0) continue
      if (earliest == null || clock < earliest) earliest = clock
    }
  }
  return earliest
}

function tradePreview(row: RebuildTradeRef & { pnl?: number }): RebuildTradePreview {
  return {
    id: row.id,
    instrument: row.instrument,
    entryId: row.entryId,
    closeId: row.closeId,
    pnl: row.pnl ?? 0,
  }
}

function sameIdSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  const rightSet = new Set(right)
  return left.every((id) => rightSet.has(id))
}

export function planProtocolTradeSwap(params: {
  existing: ExistingProtocolTrade[]
  rebuiltIds: string[]
  uncoveredIds: string[]
  unmatchedIds: string[]
  allowUnmatchedAnnotations: boolean
}): {
  keepIds: string[]
  toDelete: string[]
  analyticsDelete: string[]
} {
  const rebuiltIds = new Set(params.rebuiltIds)
  const keepIds = new Set(params.uncoveredIds)
  if (params.allowUnmatchedAnnotations) {
    for (const id of params.unmatchedIds) keepIds.add(id)
  }
  const toDelete = params.existing
    .map((row) => row.id)
    .filter((id) => !keepIds.has(id))
  const analyticsDelete = toDelete.filter((id) => !rebuiltIds.has(id))
  return { keepIds: [...keepIds], toDelete, analyticsDelete }
}

async function invalidateCachesOnSuccess(userId: string): Promise<void> {
  try {
    updateTag(`trades-${userId}`)
    updateTag(`user-data-${userId}`)
  } catch {
    revalidateTag(`trades-${userId}`, { expire: 0 })
    revalidateTag(`user-data-${userId}`, { expire: 0 })
  }
}

function tradeCreateRow(
  trade: Trade & AnnotatedProtocolTrade,
  userId: string,
  accountId: string | null,
): Trade {
  return {
    ...trade,
    userId,
    accountId,
    comment: trade.comment ?? null,
    imageBase64: trade.imageBase64 ?? null,
    imageBase64Second: trade.imageBase64Second ?? null,
    videoUrl: trade.videoUrl ?? null,
    images: trade.images ?? [],
    groupId: trade.groupId ?? '',
    tags: trade.tags ?? [RITHMIC_PROTOCOL_TRADE_TAG],
  }
}

/**
 * Admin rebuild of one Protocol trading account.
 *
 * Fetches Lucid/upstream first and only writes after a non-empty candidate
 * exists. Fill rows are merged (never wholesale-deleted) so a sliding window
 * cannot erase stored history. FIFO is seeded from the broker snapshot
 * (`P_0 = P_end − net(fills)`); fills are never trimmed from a terminal net.
 * A live apply refuses when the snapshot is missing
 * (`POSITION_SNAPSHOT_UNAVAILABLE`) or P_0 cannot be seeded
 * (`OPENING_POSITION_UNKNOWN`). Protocol trades for this account are replaced
 * in one transaction except uncovered historical rows, which are retained
 * and refuse a live apply (`UNCOVERED_TRADES`). Journal fields are copied
 * by fill-pair identity. Mood/journal rows are keyed by user+day, not Trade.
 */
export async function resyncRithmicProtocolAccount(params: {
  userId: string
  accountNumber: string
  dryRun: boolean
  actor?: string
  connectionId?: string
  allowUnmatchedAnnotations?: boolean
}): Promise<AdminAccountResyncResult> {
  const userId = params.userId.trim()
  const accountNumber = params.accountNumber.trim()
  const unlockedBefore = await summarizeAccountProtocolData(userId, accountNumber)

  const unlockedBase = {
    dryRun: params.dryRun,
    complete: false,
    userId,
    accountNumber,
    before: unlockedBefore,
  }

  const connection = await loadConnectionForAccount({
    userId,
    accountNumber,
    connectionId: params.connectionId,
  })
  if ('error' in connection) {
    console.log(
      `[ADMIN-RESYNC] actor=${params.actor ?? 'unknown'} userId=${userId} account=${accountNumber} error=${connection.error}`,
    )
    return {
      ...unlockedBase,
      error: connection.error,
      connectionIds: connection.connectionIds,
    }
  }

  const credentials = parseStoredCredentials(connection.storedTokenJson)
  if (!credentials) {
    return { ...unlockedBase, error: 'INVALID_STORED_CREDENTIALS' }
  }

  try {
    return await withProtocolSyncLock(
      protocolAccountLockKeys(userId, [accountNumber]),
      async (guard) => {
        const before = await summarizeAccountProtocolData(userId, accountNumber)
        const base = {
          dryRun: params.dryRun,
          complete: false,
          userId,
          accountNumber,
          before,
        }

        const storedFills = await loadRithmicProtocolFills({
          userId,
          accountNumbers: [accountNumber],
        })

        const snapshotRequest = {
          gatewayUri: credentials.gatewayUri,
          systemName: credentials.systemName,
          username: credentials.username,
          password: credentials.password,
          fcmId: credentials.fcmId,
          ibId: credentials.ibId,
          accountIds: connection.accountIds,
          accounts: credentials.accounts,
        }

        guard.throwIfLost()
        const beforeSnapshot = await fetchInstrumentPositions(snapshotRequest)

        let incomingFills: RithmicProtocolFill[]
        let commissionRates: Map<string, number>
        let fillWindow: FillHistoryWindow | undefined
        try {
          guard.throwIfLost()
          const fetched = await fetchFillsForAccounts({
            gatewayUri: credentials.gatewayUri,
            systemName: credentials.systemName,
            username: credentials.username,
            password: credentials.password,
            fcmId: credentials.fcmId,
            ibId: credentials.ibId,
            accountIds: connection.accountIds,
            accounts: credentials.accounts,
            historyStartDate: credentials.historyStartDate,
            lookbackDays: DEFAULT_LOOKBACK_DAYS,
            seenIdentityKeys: new Set(),
          })
          incomingFills = fetched.rawFills.filter(
            (fill) => fill.accountId === accountNumber,
          )
          commissionRates = fetched.commissionRates
          fillWindow = fetched.fillHistory
          const incompleteIds = fetched.fillHistory?.incompleteAccountIds ?? []
          const thisHistoryIncomplete =
            fetched.fillHistory?.complete !== true &&
            (incompleteIds.length === 0 ||
              incompleteIds.some(
                (id) =>
                  normalizeFillAccountId(id) ===
                  normalizeFillAccountId(accountNumber),
              ))
          if (thisHistoryIncomplete && !params.dryRun) {
            return { ...base, error: 'INCOMPLETE_FILL_HISTORY' }
          }
        } catch (error) {
          if (error instanceof ProtocolSyncLockError) throw error
          console.error('[ADMIN-RESYNC] upstream fetch failed', error)
          return { ...base, error: 'FETCH_FAILED' }
        }

        guard.throwIfLost()
        const afterSnapshot = await fetchInstrumentPositions(snapshotRequest)
        const bracket = reconcileBracketedSnapshots({
          before: beforeSnapshot,
          after: afterSnapshot,
          fills: incomingFills,
        })

        const existing = await loadExistingProtocolTrades(userId, accountNumber)
        const hasStoredData =
          before.tradeCount > 0 ||
          before.fillCount > 0 ||
          storedFills.length > 0 ||
          existing.length > 0

        if (incomingFills.length === 0 && hasStoredData) {
          return { ...base, error: 'EMPTY_UPSTREAM_HISTORY' }
        }

        const merged = mergeFillLedgers(storedFills, incomingFills)
        const prepared = prepareRithmicProtocolFills(merged)
        const fillPartition = partitionIncomingFills(incomingFills, storedFills)
        const ledgerFillIds = canonicalLedgerFillIds(merged)
        const uncovered = uncoveredProtocolTrades(existing, ledgerFillIds)

        const tickDetails = await prisma.tickDetails.findMany({
          select: { ticker: true, tickSize: true, tickValue: true },
        })
        const tickBySymbol = new Map(
          tickDetails.map((tick) => [
            tick.ticker.toUpperCase(),
            { tickSize: tick.tickSize, tickValue: tick.tickValue },
          ]),
        )

        const thisAccountFrozen = (bracket.freezeAccountIds ?? []).some(
          (id) => normalizeFillAccountId(id) === normalizeFillAccountId(accountNumber),
        )
        const snapshotStatus =
          bracket.ok && !thisAccountFrozen ? 'ok' : 'unavailable'
        const snapshotReason = thisAccountFrozen
          ? 'account_frozen'
          : bracket.ok
            ? undefined
            : bracket.reason ?? afterSnapshot.reason ?? beforeSnapshot.reason
        const scopedPositions = bracket.positions.filter(
          (position) => position.accountId === accountNumber,
        )
        const weeklyCloseMs = fillWindow?.weeklyCloseIso
          ? Date.parse(fillWindow.weeklyCloseIso)
          : NaN
        const storedAnchorMs = credentials.fifoAnchorIso
          ? Date.parse(credentials.fifoAnchorIso)
          : undefined
        const windowStartMs = pinFifoAnchorMs({
          weeklyCloseMs: Number.isFinite(weeklyCloseMs) ? weeklyCloseMs : 0,
          storedAnchorMs:
            storedAnchorMs != null && Number.isFinite(storedAnchorMs)
              ? storedAnchorMs
              : undefined,
          storedEntries: existing,
        })
        const positionChecks = bracket.ok
          ? computeOpeningPositionChecks({
              fills: prepared.fills,
              positions: scopedPositions,
              sinceMs: windowStartMs > 0 ? windowStartMs : undefined,
            })
          : []
        const seedDecision = bracket.ok
          ? decideOpeningSeeds(positionChecks, prepared.fills, windowStartMs)
          : {
              seeds: [] as ReturnType<typeof decideOpeningSeeds>['seeds'],
              skipped: [] as ReturnType<typeof decideOpeningSeeds>['skipped'],
            }
        const skippedSymbolKeys = new Set(
          seedDecision.skipped.map((row) =>
            openingPositionKey(row.accountId, row.symbol),
          ),
        )
        const derived = bracket.ok
          ? buildTradesFromRithmicFills(
              prepared.fills,
              userId,
              tickBySymbol,
              commissionRates,
              {
                openingSeeds: seedDecision.seeds,
                sinceMs: windowStartMs,
              },
            )
          : { trades: [], openSkipped: 0, skipped: {}, openNets: [] }
        const endPosition = bracket.ok
          ? fifoEndPositionMatchesPEnd({
              openNets: derived.openNets,
              positions: scopedPositions,
            })
          : { ok: true, mismatchedKeys: [] as string[] }
        if (!endPosition.ok) {
          for (const key of endPosition.mismatchedKeys) skippedSymbolKeys.add(key)
        }
        const withIds = derived.trades.map((trade) => ({
          ...trade,
          userId,
          id: generatePersistedTradeUUID({ ...trade, userId }),
        }))
        const attached = bracket.ok
          ? reattachProtocolTradeAnnotations(withIds, existing)
          : { trades: withIds, preserved: 0, unmatched: [] }
        const historyStartMs = utcYyyymmddStartMs(fillWindow?.requestedStartYmd)
        const fillIndex = indexFillsByCanonicalId(prepared.fills)
        const persistable = attached.trades.filter(
          (trade) =>
            tradeClosedOnOrAfter(trade, historyStartMs) &&
            !tradeTouchesSymbolKeys(trade, skippedSymbolKeys, fillIndex),
        )
        const extraKeepIds = existing
          .filter(
            (row) =>
              !bracket.ok ||
              !tradeClosedOnOrAfter(row, historyStartMs) ||
              tradeTouchesSymbolKeys(row, skippedSymbolKeys, fillIndex),
          )
          .map((row) => row.id)

        const duplicateIds = duplicateRebuildTradeIds(
          persistable.map((trade) => trade.id),
        )
        const swap = planProtocolTradeSwap({
          existing,
          rebuiltIds: persistable.map((trade) => trade.id),
          uncoveredIds: [
            ...uncovered.map((row) => row.id),
            ...extraKeepIds,
          ],
          unmatchedIds: attached.unmatched.map((row) => row.id),
          allowUnmatchedAnnotations: Boolean(params.allowUnmatchedAnnotations),
        })
        const nets = summarizeFillLedgerNets(prepared.fills)
        const warnings = rebuildWarnings({
          nets,
          storedFills,
          incomingFills,
          existing,
          uncoveredCount: uncovered.length,
          snapshotStatus,
          snapshotReason,
          positionChecks,
          seedCount: seedDecision.seeds.length,
          skippedOpeningSymbols: seedDecision.skipped,
          openingPositionUnknown: seedDecision.error === 'OPENING_POSITION_UNKNOWN',
          incompleteFillHistory: fillWindow?.complete === false,
          endPositionMismatchedKeys: endPosition.mismatchedKeys,
        })
        if (duplicateIds.length > 0) {
          warnings.push(
            `Rebuild would produce duplicate trade ids (${duplicateIds.join(', ')}). Live apply refuses with DUPLICATE_TRADE_IDS.`,
          )
        }
        if (params.allowUnmatchedAnnotations && attached.unmatched.length > 0) {
          warnings.push(
            'allowUnmatchedAnnotations keeps unmatched annotated rows alongside rebuilt FIFO trades. proposed.pnl is FIFO-only; kept-row P&L is extra and legs can overlap.',
          )
        }
        const deletedPnl = existing
          .filter((row) => swap.toDelete.includes(row.id))
          .reduce((sum, row) => sum + row.pnl, 0)
        const wouldDelete: AccountProtocolSnapshot = {
          tradeCount: swap.toDelete.length,
          pnl: deletedPnl,
          fillCount: 0,
        }
        const proposed = proposedSnapshot({
          trades: persistable,
          fillCount: merged.length,
          openSkipped: derived.openSkipped,
          annotatedPreserved: attached.preserved,
          unmatchedAnnotations: attached.unmatched.length,
          nets,
          positionChecks,
          snapshotStatus,
          snapshotReason,
          fillWindow,
          seededOpeningLots: seedDecision.seeds.length,
          ledgerRowsAfterMerge: merged.length,
          consolidatedFills: prepared.fills.length,
          fillsInserted: fillPartition.inserts.length,
          fillsUpdated: fillPartition.updates.length,
          tradesDeleted: swap.toDelete.length,
          tradesCreated: persistable.length,
          tradesKept: swap.keepIds.length,
          uncoveredTrades: uncovered.map(tradePreview),
          unmatchedAnnotatedTrades: attached.unmatched.map(tradePreview),
        })

        console.log(
          `[ADMIN-RESYNC] positionChecks=${JSON.stringify(
            positionChecks.map((row) => ({
              symbol: row.symbol,
              pEnd: row.pEnd,
              net: row.net,
              p0: row.p0,
            })),
          )} snapshot=${snapshotStatus}${snapshotReason ? `:${snapshotReason}` : ''} seeds=${seedDecision.seeds.length}`,
        )

        if (snapshotStatus === 'unavailable' && !params.dryRun) {
          return {
            ...base,
            wouldDelete,
            proposed,
            warnings,
            error: 'POSITION_SNAPSHOT_UNAVAILABLE',
          }
        }

        if (seedDecision.error === 'OPENING_POSITION_UNKNOWN' && !params.dryRun) {
          return {
            ...base,
            wouldDelete,
            proposed,
            warnings,
            error: 'OPENING_POSITION_UNKNOWN',
          }
        }

        if (!endPosition.ok && !params.dryRun) {
          return {
            ...base,
            wouldDelete,
            proposed,
            warnings: [
              ...warnings,
              `FIFO open position after the window did not match P_end (${endPosition.mismatchedKeys.join(', ')}). Live apply refuses with END_POSITION_MISMATCH.`,
            ],
            error: 'END_POSITION_MISMATCH',
          }
        }

        if (
          existing.length > 0 &&
          persistable.length === 0 &&
          uncovered.length === 0 &&
          extraKeepIds.length === 0
        ) {
          return {
            ...base,
            wouldDelete,
            proposed,
            warnings,
            error: 'EMPTY_REBUILD',
          }
        }

        if (duplicateIds.length > 0 && !params.dryRun) {
          return {
            ...base,
            wouldDelete,
            proposed,
            warnings,
            error: 'DUPLICATE_TRADE_IDS',
          }
        }

        if (uncovered.length > 0 && !params.dryRun) {
          return {
            ...base,
            wouldDelete,
            proposed,
            warnings,
            error: 'UNCOVERED_TRADES',
          }
        }

        if (
          attached.unmatched.length > 0 &&
          !params.allowUnmatchedAnnotations &&
          !params.dryRun
        ) {
          return {
            ...base,
            wouldDelete,
            proposed,
            warnings,
            error: 'UNMATCHED_ANNOTATIONS',
          }
        }

        console.log(
          `[ADMIN-RESYNC] actor=${params.actor ?? 'unknown'} userId=${userId} account=${accountNumber} dryRun=${params.dryRun} ` +
            `beforeTrades=${before.tradeCount} beforeFills=${before.fillCount} ` +
            `proposedTrades=${proposed.tradeCount} proposedFills=${proposed.fillCount} ` +
            `uncovered=${proposed.uncoveredTrades.length} unmatchedAnnotations=${proposed.unmatchedAnnotations} ` +
            `snapshot=${snapshotStatus} seeds=${proposed.seededOpeningLots}`,
        )

        if (params.dryRun) {
          return {
            ...base,
            complete: true,
            wouldDelete,
            proposed,
            warnings,
          }
        }

        let deletedTrades = 0
        let createdCount = 0
        try {
          guard.throwIfLost()
          await prisma.$transaction(
            async (tx) => {
              guard.throwIfLost()
              await tx.$queryRaw`
                SELECT id FROM "Trade"
                WHERE "userId" = ${userId}
                  AND "accountNumber" = ${accountNumber}
                  AND ${RITHMIC_PROTOCOL_TRADE_TAG} = ANY("tags")
                FOR UPDATE
              `
              const current = await summarizeAccountProtocolData(
                userId,
                accountNumber,
                tx as unknown as ProtocolDb,
              )
              const lockedExisting = await loadExistingProtocolTrades(
                userId,
                accountNumber,
                tx as unknown as ProtocolDb,
              )
              if (
                current.fillCount !== before.fillCount ||
                current.tradeCount !== before.tradeCount ||
                !sameIdSet(
                  lockedExisting.map((row) => row.id),
                  existing.map((row) => row.id),
                ) ||
                !protocolTradeSetsMatch(lockedExisting, existing)
              ) {
                throw new AdminApplyError('CONCURRENT_SYNC')
              }

              const accountRows = await tx.account.findMany({
                where: { userId, number: accountNumber },
                select: { id: true, number: true },
              })
              const accountIdByNumber = new Map(
                accountRows.map((account) => [account.number, account.id]),
              )

              await upsertRithmicProtocolFills({
                userId,
                fills: incomingFills,
                stored: storedFills,
                accountIdByNumber,
                connectionId: connection.connectionId,
                db: tx as unknown as typeof prisma,
              })

              if (swap.toDelete.length > 0) {
                const deleted = await tx.trade.deleteMany({
                  where: {
                    userId,
                    accountNumber,
                    tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
                    id: { in: swap.toDelete },
                  },
                })
                deletedTrades = deleted.count
              }
              if (swap.analyticsDelete.length > 0) {
                await tx.tradeAnalytics.deleteMany({
                  where: { tradeId: { in: swap.analyticsDelete } },
                })
              }

              const rows = persistable.map((trade) =>
                tradeCreateRow(
                  trade as Trade & AnnotatedProtocolTrade,
                  userId,
                  accountIdByNumber.get(trade.accountNumber ?? accountNumber) ??
                    null,
                ),
              )
              if (rows.length > 0) {
                const created = await tx.trade.createMany({
                  data: rows,
                  skipDuplicates: true,
                })
                createdCount = created.count
                if (created.count !== rows.length) {
                  throw new AdminApplyError(
                    'INSERT_MISMATCH',
                    `createMany inserted ${created.count} of ${rows.length} rebuilt trades`,
                  )
                }
              }
            },
            { timeout: 120_000, maxWait: 15_000 },
          )
        } catch (error) {
          if (error instanceof ProtocolSyncLockError) throw error
          const code =
            error instanceof AdminApplyError
              ? error.code
              : error instanceof Error && error.message === 'CONCURRENT_SYNC'
                ? 'CONCURRENT_SYNC'
                : undefined
          if (code === 'CONCURRENT_SYNC' || code === 'INSERT_MISMATCH') {
            return { ...base, proposed, warnings, error: code }
          }
          console.error('[ADMIN-RESYNC] apply failed; stored ledger left unchanged', error)
          return { ...base, proposed, warnings, error: 'APPLY_FAILED' }
        }

        try {
          guard.throwIfLost()
        } catch {
          warnings.push(
            'Advisory lock connection was lost after the rebuild committed.',
          )
        }

        try {
          await invalidateCachesOnSuccess(userId)
        } catch (error) {
          console.error('[ADMIN-RESYNC] cache invalidation failed after commit', error)
          warnings.push('Cache invalidation failed after the rebuild committed.')
        }

        try {
          const afterSnapshot = await summarizeAccountProtocolData(
            userId,
            accountNumber,
          )
          const after = {
            ...afterSnapshot,
            savedCount: createdCount,
            tradesCount: afterSnapshot.tradeCount,
          }
          console.log(
            `[ADMIN-RESYNC] actor=${params.actor ?? 'unknown'} userId=${userId} account=${accountNumber} dryRun=false ` +
              `deletedTrades=${deletedTrades} deletedFills=0 created=${createdCount} ` +
              `beforeTrades=${before.tradeCount} afterTrades=${after.tradeCount} ` +
              `saved=${after.savedCount}`,
          )
          return {
            ...base,
            complete: true,
            committed: true,
            wouldDelete,
            proposed,
            warnings,
            deleted: { trades: deletedTrades, fills: 0 },
            after,
          }
        } catch (error) {
          console.error('[ADMIN-RESYNC] post-commit read failed', error)
          return {
            ...base,
            complete: true,
            committed: true,
            wouldDelete,
            proposed,
            warnings: [
              ...warnings,
              'Rebuild committed; a follow-up read failed. Stored trades were replaced.',
            ],
            deleted: { trades: deletedTrades, fills: 0 },
            after: {
              tradeCount: proposed.tradeCount + swap.keepIds.length,
              pnl:
                proposed.pnl +
                existing
                  .filter((row) => swap.keepIds.includes(row.id))
                  .reduce((sum, row) => sum + row.pnl, 0),
              fillCount: proposed.fillCount,
              savedCount: createdCount,
              tradesCount: proposed.tradeCount + swap.keepIds.length,
            },
            error: 'POST_COMMIT_WARNING',
          }
        }
      },
    )
  } catch (error) {
    if (error instanceof ProtocolSyncLockError) {
      return { ...unlockedBase, error: error.code }
    }
    console.error('[ADMIN-RESYNC] failed before apply', error)
    return { ...unlockedBase, error: 'SYNC_FAILED' }
  }
}

function proposedSnapshot(params: {
  trades: Array<{ pnl: number }>
  fillCount: number
  openSkipped: number
  annotatedPreserved: number
  unmatchedAnnotations: number
  nets: FillLedgerNet[]
  positionChecks: OpeningPositionCheck[]
  snapshotStatus: 'ok' | 'unavailable'
  snapshotReason?: string
  fillWindow?: FillHistoryWindow
  seededOpeningLots: number
  ledgerRowsAfterMerge: number
  consolidatedFills: number
  fillsInserted: number
  fillsUpdated: number
  tradesDeleted: number
  tradesCreated: number
  tradesKept: number
  uncoveredTrades: RebuildTradePreview[]
  unmatchedAnnotatedTrades: RebuildTradePreview[]
}): ProposedRebuildSnapshot {
  return {
    tradeCount: params.trades.length,
    pnl: params.trades.reduce((sum, trade) => sum + trade.pnl, 0),
    fillCount: params.fillCount,
    openSkipped: params.openSkipped,
    annotatedPreserved: params.annotatedPreserved,
    unmatchedAnnotations: params.unmatchedAnnotations,
    nets: params.nets,
    positionChecks: params.positionChecks,
    snapshotStatus: params.snapshotStatus,
    snapshotReason: params.snapshotReason,
    fillWindow: params.fillWindow,
    seededOpeningLots: params.seededOpeningLots,
    ledgerRowsAfterMerge: params.ledgerRowsAfterMerge,
    consolidatedFills: params.consolidatedFills,
    fillsInserted: params.fillsInserted,
    fillsUpdated: params.fillsUpdated,
    tradesDeleted: params.tradesDeleted,
    tradesCreated: params.tradesCreated,
    tradesKept: params.tradesKept,
    uncoveredTrades: params.uncoveredTrades,
    unmatchedAnnotatedTrades: params.unmatchedAnnotatedTrades,
  }
}

function rebuildWarnings(params: {
  nets: FillLedgerNet[]
  storedFills: RithmicProtocolFill[]
  incomingFills: RithmicProtocolFill[]
  existing: ExistingProtocolTrade[]
  uncoveredCount: number
  snapshotStatus: 'ok' | 'unavailable'
  snapshotReason?: string
  positionChecks: OpeningPositionCheck[]
  seedCount: number
  skippedOpeningSymbols: ReturnType<typeof decideOpeningSeeds>['skipped']
  openingPositionUnknown: boolean
  incompleteFillHistory?: boolean
  endPositionMismatchedKeys?: string[]
}): string[] {
  const warnings: string[] = []
  if (params.incompleteFillHistory) {
    warnings.push(
      'ShowFillHistory was incomplete. Live apply refuses with INCOMPLETE_FILL_HISTORY rather than inventing opening lots from a partial ledger.',
    )
  }
  if (params.snapshotStatus === 'unavailable') {
    warnings.push(
      `Broker position snapshot was unavailable${params.snapshotReason ? ` (${params.snapshotReason})` : ''}. Live apply refuses with POSITION_SNAPSHOT_UNAVAILABLE rather than inventing opening lots from fills.`,
    )
  }
  if (params.skippedOpeningSymbols.length > 0) {
    warnings.push(
      `Skipped seeding ${params.skippedOpeningSymbols
        .map((row) => `${row.symbol} (${row.reason})`)
        .join(', ')}. Existing rows for those symbols are kept.`,
    )
  }
  if (params.endPositionMismatchedKeys && params.endPositionMismatchedKeys.length > 0) {
    warnings.push(
      `FIFO open position after the window did not match P_end (${params.endPositionMismatchedKeys.join(', ')}). Live apply refuses with END_POSITION_MISMATCH.`,
    )
  }
  if (params.openingPositionUnknown) {
    warnings.push(
      'Opening position P_0 is known but cannot be seeded with a conservative price. Live apply refuses with OPENING_POSITION_UNKNOWN.',
    )
  }
  if (params.snapshotStatus === 'ok' && params.seedCount > 0) {
    warnings.push(
      `Seeded ${params.seedCount} synthetic opening lot(s) from P_0 = P_end − net(fills). Closes against those lots are tagged rithmic-protocol-opening-seed with 0 attributed PnL.`,
    )
  }
  if (params.snapshotStatus !== 'ok' && params.nets.length > 0) {
    warnings.push(
      'Terminal fill net is non-zero. A rebuild from fills alone cannot tell a live position from missing opening history; supply a broker position snapshot before altering fills.',
    )
  }
  if (
    params.snapshotStatus === 'ok' &&
    params.positionChecks.some((row) => row.p0 !== 0) &&
    params.seedCount === 0 &&
    !params.openingPositionUnknown
  ) {
    warnings.push(
      'Broker snapshot shows a non-zero opening position that was not seeded.',
    )
  }
  if (params.uncoveredCount > 0) {
    warnings.push(
      `${params.uncoveredCount} stored protocol trade(s) have legs outside the merged fill ledger. Live apply refuses with UNCOVERED_TRADES so those rows are not deleted.`,
    )
  }
  const storedFillEarliest = earliestFillClock(params.storedFills)
  const storedTradeEarliest = earliestTradeClock(params.existing)
  const storedEarliest =
    storedFillEarliest == null
      ? storedTradeEarliest
      : storedTradeEarliest == null
        ? storedFillEarliest
        : Math.min(storedFillEarliest, storedTradeEarliest)
  const incomingEarliest = earliestFillClock(params.incomingFills)
  if (
    storedEarliest != null &&
    incomingEarliest != null &&
    incomingEarliest > storedEarliest
  ) {
    warnings.push(
      'Upstream history starts later than stored fills or trades. Stored fills were kept and merged; uncovered trades are retained and live apply refuses rather than deleting history the window cannot recreate.',
    )
  }
  return warnings
}
