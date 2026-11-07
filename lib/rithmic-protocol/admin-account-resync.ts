import 'server-only'
import { revalidateTag, updateTag } from 'next/cache'
import type { Trade } from '@/prisma/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { decryptConnectionToken } from '@/lib/connection-token-crypto'
import { generatePersistedTradeUUID, RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
import { fetchInstrumentPositions } from '@/lib/rithmic-protocol/client'
import { AdminFillFetchError, fetchAdminRebuildFills } from './admin-fill-fetch'
import {
  type AdminFillWindowCoverage,
  inWindowDerivedTrades,
  ordinarySyncTradesMatchRebuild,
  storedFillsMissingUpstream,
  uncoveredTradesByFillIdentity,
} from './admin-fill-coverage'
import {
  gatewayUri as gatewayUriFor,
  resolveGateway,
} from '@/lib/rithmic-protocol/systems'
import {
  resolveAdminWeekendAnchor,
  toUtcYyyyMmDd,
  utcCalendarDayAfter,
} from './cme-session'
import {
  instrumentPositionMapsEqual,
  snapshotTouchesAccount,
  type CapturedInstrumentSnapshot,
} from './instrument-position'
import {
  fillFallsInsideSnapshotBracket,
  snapshotIsFresh,
} from './instrument-snapshot'
import {
  type OpeningPositionCheck,
  computeOpeningPositionChecks,
  fillHasUsablePrice,
  formatOpeningNotFlatReport,
  groupFillsByExactSymbol,
  incomingFillTimestampError,
  isPreAnchorTrade,
  nonFlatOpeningChecks,
  windowFillsFrom,
} from './opening-position'
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
  duplicateRebuildTradeIds,
  deriveTradesFromFillLedger,
  mergeFillLedgers,
  partitionIncomingFills,
  prepareRithmicProtocolFills,
  protocolTradeSetsMatch,
  reattachProtocolTradeAnnotations,
  summarizeFillLedgerNets,
} from './fill-ledger'
import { buildTradesFromRithmicFills, fillTimestampMs } from './fills-to-trades'
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
  commission: true,
} as const

const ADMIN_RESYNC_DEADLINE_MS = 240_000

export type AccountProtocolSnapshot = {
  tradeCount: number
  pnl: number
  fillCount: number
}

export type RebuildTradePreview = RebuildTradeRef & { pnl: number }

export type FillHistoryWindow = {
  weeklyCloseIso: string
  historyStartYmd: string
  endYmd: string
  coverage?: AdminFillWindowCoverage[]
  coverageReachesAnchor?: boolean
}

export type ProposedRebuildSnapshot = AccountProtocolSnapshot & {
  openSkipped: number
  annotatedPreserved: number
  unmatchedAnnotations: number
  nets: FillLedgerNet[]
  positionChecks: OpeningPositionCheck[]
  snapshotStatus: 'ok'
  snapshotReason?: string
  fillWindow?: FillHistoryWindow
  openingNotFlatReport?: string
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
  wouldRefuse?: boolean
  wouldRefuseReasons?: string[]
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
}

type ProtocolDb = typeof prisma

type ExistingProtocolTrade = AnnotatedProtocolTrade & {
  pnl: number
  commission?: number | null
  entryDate?: string | null
  closeDate?: string | null
}

class AdminApplyError extends Error {
  constructor(
    public readonly code: 'CONCURRENT_SYNC' | 'INSERT_MISMATCH' | 'CONNECTION_UNLINKED',
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
  retainIds?: string[]
}): {
  keepIds: string[]
  toDelete: string[]
  analyticsDelete: string[]
} {
  const rebuiltIds = new Set(params.rebuiltIds)
  const keepIds = new Set(params.uncoveredIds)
  for (const id of params.retainIds ?? []) keepIds.add(id)
  if (params.allowUnmatchedAnnotations) {
    for (const id of params.unmatchedIds) keepIds.add(id)
  }
  const toDelete = params.existing
    .map((row) => row.id)
    .filter((id) => !keepIds.has(id))
  const analyticsDelete = toDelete.filter((id) => !rebuiltIds.has(id))
  return { keepIds: [...keepIds], toDelete, analyticsDelete }
}

function snapshotTouchesOptional(
  snapshot: CapturedInstrumentSnapshot,
  accountId: string,
  key: 'malformedAccountIds' | 'lateInstrumentAccountIds',
): boolean {
  return (snapshot[key] ?? []).includes(accountId)
}

function classifyOneSnapshot(
  snapshot: CapturedInstrumentSnapshot,
  accountId: string,
): { ok: false; error: string; reason?: string } | { ok: true } {
  if (snapshotTouchesAccount(snapshot, accountId, 'rejectedAccountIds')) {
    return { ok: false, error: 'ACCOUNT_REJECTED', reason: snapshot.reason ?? 'rejected' }
  }
  if (snapshotTouchesAccount(snapshot, accountId, 'missingAccountIds')) {
    return { ok: false, error: 'ACCOUNT_NOT_FOUND', reason: snapshot.reason ?? 'account_not_found' }
  }
  if (snapshotTouchesAccount(snapshot, accountId, 'noDataAccountIds')) {
    return {
      ok: false,
      error: 'POSITION_SNAPSHOT_UNAVAILABLE',
      reason: 'no_data',
    }
  }
  if (snapshotTouchesOptional(snapshot, accountId, 'malformedAccountIds')) {
    return {
      ok: false,
      error: 'POSITION_SNAPSHOT_UNAVAILABLE',
      reason: 'malformed_position',
    }
  }
  if (snapshotTouchesOptional(snapshot, accountId, 'lateInstrumentAccountIds')) {
    return {
      ok: false,
      error: 'POSITION_SNAPSHOT_UNAVAILABLE',
      reason: 'late_instrument_update',
    }
  }
  if (!snapshotTouchesAccount(snapshot, accountId, 'evidenceAccountIds')) {
    return {
      ok: false,
      error: 'POSITION_SNAPSHOT_UNAVAILABLE',
      reason: 'no_evidence',
    }
  }
  if (
    !snapshot.complete ||
    snapshotTouchesAccount(snapshot, accountId, 'incompleteAccountIds')
  ) {
    return {
      ok: false,
      error: 'POSITION_SNAPSHOT_UNAVAILABLE',
      reason: snapshot.reason ?? 'incomplete',
    }
  }
  return { ok: true }
}

function classifyAdminSnapshots(params: {
  before: CapturedInstrumentSnapshot
  after: CapturedInstrumentSnapshot
  accountId: string
  fillTimesMs: number[]
  nowMs?: number
}):
  | { ok: true; positions: CapturedInstrumentSnapshot['positions'] }
  | { ok: false; error: string; reason?: string } {
  const { before, after, accountId } = params
  const first = classifyOneSnapshot(before, accountId)
  if (!first.ok) return first
  const second = classifyOneSnapshot(after, accountId)
  if (!second.ok) return second
  if (!snapshotIsFresh(after, params.nowMs)) {
    return { ok: false, error: 'POSITION_SNAPSHOT_STALE', reason: 'stale_after_snapshot' }
  }
  if (
    params.fillTimesMs.some(
      (fillMs) =>
        fillFallsInsideSnapshotBracket(fillMs, before) ||
        fillFallsInsideSnapshotBracket(fillMs, after),
    )
  ) {
    return {
      ok: false,
      error: 'POSITION_SNAPSHOT_MOVED',
      reason: 'fill_during_snapshot',
    }
  }
  if (!instrumentPositionMapsEqual(before.positions, after.positions, accountId)) {
    return {
      ok: false,
      error: 'POSITION_SNAPSHOT_MOVED',
      reason: 'before_after_mismatch',
    }
  }
  return { ok: true, positions: after.positions }
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
 * Fetches fills from a CME Friday 17:00 CT weekend close (admin-picked,
 * defaulting to the most recent close before the earliest fill needed) and
 * reads broker instrument positions before and after that fetch. FIFO runs
 * only when every exact symbol is flat at the anchor (`P_0 = P_end − net =
 * 0`). A non-zero P_0 refuses with a per-symbol report — no seed lots.
 * Pre-anchor trades are never deleted. Ordinary Protocol sync is untouched.
 */
export async function resyncRithmicProtocolAccount(params: {
  userId: string
  accountNumber: string
  dryRun: boolean
  actor?: string
  connectionId?: string
  allowUnmatchedAnnotations?: boolean
  /** YYYY-MM-DD or ISO timestamp; snapped to the Friday 17:00 CT close. */
  anchorDate?: string
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
    console.log(
      `[ADMIN-RESYNC] actor=${params.actor ?? 'unknown'} userId=${userId} account=${accountNumber} error=INVALID_STORED_CREDENTIALS`,
    )
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
        const finish = (result: AdminAccountResyncResult): AdminAccountResyncResult => {
          console.log(
            `[ADMIN-RESYNC] actor=${params.actor ?? 'unknown'} userId=${userId} account=${accountNumber} ` +
              `dryRun=${params.dryRun} complete=${result.complete} error=${result.error ?? 'ok'} ` +
              `wouldRefuse=${result.wouldRefuse ?? false}`,
          )
          return result
        }

        const storedFills = await loadRithmicProtocolFills({
          userId,
          accountNumbers: [accountNumber],
        })
        const existing = await loadExistingProtocolTrades(userId, accountNumber)

        let weeklyClose: Date
        let historyStartYmd: string
        try {
          const earliestStoredFill = earliestFillClock(storedFills)
          const earliestTrade = earliestTradeClock(existing)
          const earliestNeededSec =
            earliestStoredFill == null
              ? earliestTrade
              : earliestTrade == null
                ? earliestStoredFill
                : Math.min(earliestStoredFill, earliestTrade)
          const resolved = resolveAdminWeekendAnchor({
            requestedAnchor: params.anchorDate,
            earliestNeededMs:
              earliestNeededSec != null ? earliestNeededSec * 1000 : Date.now(),
          })
          weeklyClose = resolved.weeklyClose
          historyStartYmd = resolved.historyStartYmd
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (message.startsWith('INVALID_ANCHOR_DATE')) {
            return finish({ ...base, error: 'INVALID_ANCHOR_DATE' })
          }
          if (message.startsWith('ANCHOR_IN_FUTURE')) {
            return finish({ ...base, error: 'ANCHOR_IN_FUTURE' })
          }
          if (message.startsWith('ANCHOR_TOO_OLD')) {
            return finish({ ...base, error: 'ANCHOR_TOO_OLD' })
          }
          throw error
        }
        const deadlineMs = Date.now() + ADMIN_RESYNC_DEADLINE_MS
        const windowStartMs = weeklyClose.getTime()
        const fillWindow: FillHistoryWindow = {
          weeklyCloseIso: weeklyClose.toISOString(),
          historyStartYmd,
          endYmd: toUtcYyyyMmDd(utcCalendarDayAfter(new Date())),
        }

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
        const beforeUsable = classifyOneSnapshot(beforeSnapshot, accountNumber)
        if (!beforeUsable.ok) {
          return finish({
            ...base,
            error: beforeUsable.error,
            warnings: [
              `Broker position snapshot refused (${beforeUsable.error}${beforeUsable.reason ? `: ${beforeUsable.reason}` : ''}).`,
            ],
          })
        }

        let incomingFills: RithmicProtocolFill[]
        let commissionRates: Map<string, number>
        let commissionStatus: 'ok' | 'empty' | 'failed' = 'ok'
        let coverage: AdminFillWindowCoverage[] = []
        try {
          if (Date.now() >= deadlineMs) {
            return finish({ ...base, error: 'FILL_FETCH_TIMEOUT' })
          }
          guard.throwIfLost()
          const fetched = await fetchAdminRebuildFills({
            gatewayUri: credentials.gatewayUri,
            systemName: credentials.systemName,
            username: credentials.username,
            password: credentials.password,
            fcmId: credentials.fcmId,
            ibId: credentials.ibId,
            accountId: accountNumber,
            accounts: credentials.accounts,
            historyStartDate: historyStartYmd,
          })
          incomingFills = fetched.rawFills.filter(
            (fill) => fill.accountId === accountNumber,
          )
          commissionRates = fetched.commissionRates
          commissionStatus = fetched.commissionStatus
          coverage = fetched.coverage
          fillWindow.coverage = coverage
          fillWindow.coverageReachesAnchor = coverage[0]?.resolved === true
        } catch (error) {
          if (error instanceof ProtocolSyncLockError) throw error
          if (error instanceof AdminFillFetchError) {
            return finish({ ...base, error: error.code })
          }
          console.error('[ADMIN-RESYNC] upstream fetch failed', error)
          return finish({ ...base, error: 'FETCH_FAILED' })
        }

        const timestampError = incomingFillTimestampError(
          incomingFills,
          historyStartYmd,
        )
        if (timestampError) {
          return finish({ ...base, error: timestampError })
        }

        const windowIncoming = windowFillsFrom(incomingFills, windowStartMs)
        const inWindowExisting = existing.filter(
          (row) => !isPreAnchorTrade(row, windowStartMs),
        )
        const preAnchorExisting = existing.filter((row) =>
          isPreAnchorTrade(row, windowStartMs),
        )
        const inWindowStoredFills = windowFillsFrom(storedFills, windowStartMs)

        if (windowIncoming.some((fill) => !fillHasUsablePrice(fill))) {
          return finish({ ...base, error: 'FILLS_MISSING_PRICE' })
        }

        if (
          windowIncoming.length === 0 &&
          (inWindowExisting.length > 0 || inWindowStoredFills.length > 0)
        ) {
          return finish({ ...base, error: 'EMPTY_UPSTREAM_HISTORY' })
        }

        if (
          coverage.length === 0 ||
          coverage[0]?.startYmd !== historyStartYmd ||
          coverage[0]?.resolved !== true
        ) {
          return finish({ ...base, error: 'WINDOW_DOES_NOT_REACH_ANCHOR' })
        }

        if (Date.now() >= deadlineMs) {
          return finish({ ...base, error: 'FILL_FETCH_TIMEOUT' })
        }
        guard.throwIfLost()
        const afterBrokerSnapshot = await fetchInstrumentPositions(snapshotRequest)
        const bracket = classifyAdminSnapshots({
          before: beforeSnapshot,
          after: afterBrokerSnapshot,
          accountId: accountNumber,
          fillTimesMs: windowIncoming.map((fill) => fillTimestampMs(fill)),
        })
        if (!bracket.ok) {
          return finish({
            ...base,
            error: bracket.error,
            warnings: [
              `Broker position snapshot refused (${bracket.error}${bracket.reason ? `: ${bracket.reason}` : ''}).`,
            ],
          })
        }
        const snapshotStatus = 'ok' as const
        const snapshotReason = undefined

        const prepared = prepareRithmicProtocolFills(windowIncoming)
        const merged = mergeFillLedgers(storedFills, windowIncoming)
        const fillPartition = partitionIncomingFills(windowIncoming, storedFills)
        const missingStoredFills = storedFillsMissingUpstream(
          inWindowStoredFills,
          windowIncoming,
        )
        const uncovered = uncoveredTradesByFillIdentity(
          inWindowExisting,
          windowIncoming,
        )

        const scopedPositions = bracket.positions.filter(
          (position) => position.accountId === accountNumber,
        )
        const positionChecks = computeOpeningPositionChecks({
          fills: prepared.fills,
          positions: scopedPositions,
          accountId: accountNumber,
        })
        const notFlat = nonFlatOpeningChecks(positionChecks)
        const openingNotFlatReport = formatOpeningNotFlatReport(positionChecks)

        const tickDetails = await prisma.tickDetails.findMany({
          select: { ticker: true, tickSize: true, tickValue: true },
        })
        const tickBySymbol = new Map(
          tickDetails.map((tick) => [
            tick.ticker.toUpperCase(),
            { tickSize: tick.tickSize, tickValue: tick.tickValue },
          ]),
        )
        const derivedTrades: ReturnType<typeof buildTradesFromRithmicFills>['trades'] = []
        let openSkipped = 0
        let fifoSkipped = false
        let fifoOpenLotsMismatch = false
        for (const [, symbolFills] of groupFillsByExactSymbol(prepared.fills)) {
          const symbol = (symbolFills[0]?.symbol || '').trim().toUpperCase()
          const derived = buildTradesFromRithmicFills(
            symbolFills,
            userId,
            tickBySymbol,
            commissionRates,
          )
          derivedTrades.push(...derived.trades)
          openSkipped += derived.openSkipped
          if (Object.values(derived.skipped).some((count) => count > 0)) {
            fifoSkipped = true
          }
          const pEnd = Math.abs(
            positionChecks.find((row) => row.symbol === symbol)?.pEnd ?? 0,
          )
          if (derived.openSkipped !== pEnd) fifoOpenLotsMismatch = true
        }

        const ordinaryPrepared = deriveTradesFromFillLedger(
          storedFills,
          windowIncoming,
        )
        const ordinaryDerived = buildTradesFromRithmicFills(
          ordinaryPrepared.fills,
          userId,
          tickBySymbol,
          commissionRates,
        )
        const ordinaryInWindow = inWindowDerivedTrades(
          ordinaryDerived.trades,
          windowStartMs,
        )
        const ordinaryDiverges = !ordinarySyncTradesMatchRebuild(
          ordinaryInWindow,
          derivedTrades,
        )

        const withIds = derivedTrades.map((trade) => ({
          ...trade,
          userId,
          id: generatePersistedTradeUUID({ ...trade, userId }),
        }))
        const attached = reattachProtocolTradeAnnotations(withIds, inWindowExisting)
        if (commissionStatus !== 'ok') {
          for (const trade of attached.trades) {
            const stored = inWindowExisting.find((row) => row.id === trade.id)
            if (stored && typeof stored.commission === 'number') {
              trade.commission = stored.commission
            }
          }
        }
        if (
          inWindowExisting.length > 0 &&
          attached.trades.length === 0 &&
          uncovered.length === 0
        ) {
          return finish({ ...base, error: 'EMPTY_REBUILD' })
        }

        const duplicateIds = duplicateRebuildTradeIds(
          attached.trades.map((trade) => trade.id),
        )
        const swap = planProtocolTradeSwap({
          existing,
          rebuiltIds: attached.trades.map((trade) => trade.id),
          uncoveredIds: uncovered.map((row) => row.id),
          unmatchedIds: attached.unmatched.map((row) => row.id),
          allowUnmatchedAnnotations: false,
          retainIds: preAnchorExisting.map((row) => row.id),
        })
        const nets = summarizeFillLedgerNets(prepared.fills)
        const warnings = rebuildWarnings({
          nets,
          storedFills,
          incomingFills: windowIncoming,
          existing,
          uncoveredCount: uncovered.length,
        })
        if (notFlat.length > 0) {
          warnings.push(openingNotFlatReport)
        }
        if (fifoOpenLotsMismatch) {
          warnings.push(
            'FIFO leftover lots did not match broker P_end per exact symbol. Live apply refuses with FIFO_OPEN_LOTS.',
          )
        }
        if (fifoSkipped) {
          warnings.push(
            'FIFO skipped malformed fills. Live apply refuses with FIFO_SKIPPED_FILLS.',
          )
        }
        if (ordinaryDiverges) {
          warnings.push(
            'Ordinary-sync FIFO on the proposed merged ledger does not match the rebuild plan. Live apply refuses with ORDINARY_SYNC_DIVERGENCE.',
          )
        }
        if (duplicateIds.length > 0) {
          warnings.push(
            `Rebuild would produce duplicate trade ids (${duplicateIds.join(', ')}). Live apply refuses with DUPLICATE_TRADE_IDS.`,
          )
        }
        if (params.allowUnmatchedAnnotations) {
          warnings.push(
            'allowUnmatchedAnnotations is ignored. Unmatched annotated rows must be resolved before apply.',
          )
        }
        if (commissionStatus !== 'ok') {
          warnings.push(
            'COMMISSION_RATES_UNAVAILABLE: Product RMS returned no rates; rematched rows keep stored commission.',
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
          trades: attached.trades,
          fillCount: merged.length,
          openSkipped,
          annotatedPreserved: attached.preserved,
          unmatchedAnnotations: attached.unmatched.length,
          nets,
          positionChecks,
          snapshotStatus,
          snapshotReason,
          fillWindow,
          openingNotFlatReport: openingNotFlatReport || undefined,
          ledgerRowsAfterMerge: merged.length,
          consolidatedFills: prepared.fills.length,
          fillsInserted: fillPartition.inserts.length,
          fillsUpdated: fillPartition.updates.length,
          tradesDeleted: swap.toDelete.length,
          tradesCreated: attached.trades.length,
          tradesKept: swap.keepIds.length,
          uncoveredTrades: uncovered.map(tradePreview),
          unmatchedAnnotatedTrades: attached.unmatched.map(tradePreview),
        })

        if (notFlat.length > 0) {
          return finish({
            ...base,
            wouldDelete,
            proposed,
            warnings,
            error: 'OPENING_NOT_FLAT',
          })
        }
        const wouldRefuseReasons: string[] = []
        if (fifoOpenLotsMismatch) wouldRefuseReasons.push('FIFO_OPEN_LOTS')
        if (fifoSkipped) wouldRefuseReasons.push('FIFO_SKIPPED_FILLS')
        if (ordinaryDiverges) wouldRefuseReasons.push('ORDINARY_SYNC_DIVERGENCE')
        if (duplicateIds.length > 0) wouldRefuseReasons.push('DUPLICATE_TRADE_IDS')
        if (uncovered.length > 0) wouldRefuseReasons.push('UNCOVERED_TRADES')
        if (missingStoredFills.length > 0) {
          wouldRefuseReasons.push('STORED_FILL_MISSING_UPSTREAM')
        }
        if (attached.unmatched.length > 0) {
          wouldRefuseReasons.push('UNMATCHED_ANNOTATIONS')
        }
        const newZeroCommission =
          commissionStatus !== 'ok' &&
          attached.trades.some((trade) => !trade.commission)
        if (newZeroCommission) {
          wouldRefuseReasons.push('COMMISSION_RATES_UNAVAILABLE')
        }

        if (wouldRefuseReasons.length > 0) {
          if (params.dryRun) {
            return finish({
              ...base,
              complete: true,
              wouldDelete,
              proposed,
              warnings,
              wouldRefuse: true,
              wouldRefuseReasons,
            })
          }
          return finish({
            ...base,
            wouldDelete,
            proposed,
            warnings,
            error: wouldRefuseReasons[0],
          })
        }

        if (params.dryRun) {
          return finish({
            ...base,
            complete: true,
            wouldDelete,
            proposed,
            warnings,
          })
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

              const stillLinked = await tx.connection.findFirst({
                where: {
                  id: connection.connectionId,
                  userId,
                  accounts: { some: { number: accountNumber } },
                },
                select: { id: true },
              })
              if (!stillLinked) {
                throw new AdminApplyError('CONNECTION_UNLINKED')
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
                fills: windowIncoming,
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

              const rows = attached.trades.map((trade) =>
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
          if (
            code === 'CONCURRENT_SYNC' ||
            code === 'INSERT_MISMATCH' ||
            code === 'CONNECTION_UNLINKED'
          ) {
            return finish({ ...base, proposed, warnings, error: code })
          }
          console.error('[ADMIN-RESYNC] apply failed; stored ledger left unchanged', error)
          return finish({ ...base, proposed, warnings, error: 'APPLY_FAILED' })
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
          return finish({
            ...base,
            complete: true,
            committed: true,
            wouldDelete,
            proposed,
            warnings,
            deleted: { trades: deletedTrades, fills: 0 },
            after,
          })
        } catch (error) {
          console.error('[ADMIN-RESYNC] post-commit read failed', error)
          return finish({
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
          })
        }
      },
    )
  } catch (error) {
    if (error instanceof ProtocolSyncLockError) {
      console.log(
        `[ADMIN-RESYNC] actor=${params.actor ?? 'unknown'} userId=${userId} account=${accountNumber} error=${error.code}`,
      )
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
  snapshotStatus: 'ok'
  snapshotReason?: string
  fillWindow?: FillHistoryWindow
  openingNotFlatReport?: string
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
    openingNotFlatReport: params.openingNotFlatReport,
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
}): string[] {
  const warnings: string[] = []
  if (params.nets.length > 0) {
    warnings.push(
      'Window fill net is non-zero. Broker P_end must match that net so P_0 is 0; a non-zero P_0 refuses with OPENING_NOT_FLAT.',
    )
  }
  if (params.uncoveredCount > 0) {
    warnings.push(
      `${params.uncoveredCount} stored protocol trade(s) have legs that are not in the raw in-window fills (identity includes time, quantity, and price). Live apply refuses with UNCOVERED_TRADES so those rows are not deleted.`,
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
      'Upstream history starts later than stored fills or trades. Pre-anchor rows are retained; in-window uncovered trades refuse live apply rather than deleting history the window cannot recreate.',
    )
  }
  return warnings
}
