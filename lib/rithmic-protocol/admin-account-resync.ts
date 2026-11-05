import 'server-only'
import { revalidateTag, updateTag } from 'next/cache'
import type { Trade } from '@/prisma/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { decryptConnectionToken } from '@/lib/connection-token-crypto'
import { generatePersistedTradeUUID, RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
import { fetchFillsForAccounts } from '@/lib/rithmic-protocol/client'
import {
  gatewayUri as gatewayUriFor,
  resolveGateway,
} from '@/lib/rithmic-protocol/systems'
import { scopeProtocolAccountIds } from './scope-accounts'
import { withProtocolSyncLock } from './sync-lock'
import {
  loadRithmicProtocolFills,
  upsertRithmicProtocolFills,
} from './fill-ledger-store'
import {
  type AnnotatedProtocolTrade,
  type FillLedgerNet,
  deriveTradesFromFillLedger,
  reattachProtocolTradeAnnotations,
  summarizeFillLedgerNets,
} from './fill-ledger'
import { buildTradesFromRithmicFills } from './fills-to-trades'
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

export type ProposedRebuildSnapshot = AccountProtocolSnapshot & {
  openSkipped: number
  annotatedPreserved: number
  unmatchedAnnotations: number
  nets: FillLedgerNet[]
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
}

type ProtocolDb = typeof prisma

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

export async function deleteAccountProtocolTradesAndFills(
  userId: string,
  accountNumber: string,
): Promise<{ trades: number; fills: number }> {
  const [trades, fills] = await prisma.$transaction([
    prisma.trade.deleteMany({
      where: {
        userId,
        accountNumber,
        tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
      },
    }),
    prisma.rithmicProtocolFill.deleteMany({
      where: { userId, accountNumber },
    }),
  ])
  return { trades: trades.count, fills: fills.count }
}

async function loadAnnotatedProtocolTrades(
  userId: string,
  accountNumber: string,
  db: ProtocolDb = prisma,
): Promise<AnnotatedProtocolTrade[]> {
  return db.trade.findMany({
    where: {
      userId,
      accountNumber,
      tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
    },
    select: ANNOTATION_SELECT,
  }) as Promise<AnnotatedProtocolTrade[]>
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
 * cannot erase stored history. Protocol trades for this account are replaced
 * in one transaction; journal fields are copied by fill-pair identity.
 * Mood/journal rows are keyed by user+day, not Trade, so they are not
 * cascaded.
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
  const before = await summarizeAccountProtocolData(userId, accountNumber)

  const base = {
    dryRun: params.dryRun,
    complete: false,
    userId,
    accountNumber,
    before,
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
      ...base,
      error: connection.error,
      connectionIds: connection.connectionIds,
    }
  }

  const credentials = parseStoredCredentials(connection.storedTokenJson)
  if (!credentials) {
    return { ...base, error: 'INVALID_STORED_CREDENTIALS' }
  }

  try {
    return await withProtocolSyncLock(connection.connectionId, async () => {
      const storedFills = await loadRithmicProtocolFills({
        userId,
        accountNumbers: [accountNumber],
      })

      let incomingFills: RithmicProtocolFill[]
      try {
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
      } catch (error) {
        console.error('[ADMIN-RESYNC] upstream fetch failed', error)
        return { ...base, error: 'FETCH_FAILED' }
      }

      if (incomingFills.length === 0 && storedFills.length > 0) {
        return { ...base, error: 'EMPTY_UPSTREAM_HISTORY' }
      }

      const prepared = deriveTradesFromFillLedger(storedFills, incomingFills)
      if (storedFills.length > 0 && prepared.fills.length === 0) {
        return { ...base, error: 'EMPTY_REBUILD' }
      }

      const tickDetails = await prisma.tickDetails.findMany({
        select: { ticker: true, tickSize: true, tickValue: true },
      })
      const tickBySymbol = new Map(
        tickDetails.map((tick) => [
          tick.ticker.toUpperCase(),
          { tickSize: tick.tickSize, tickValue: tick.tickValue },
        ]),
      )
      const derived = buildTradesFromRithmicFills(
        prepared.fills,
        userId,
        tickBySymbol,
      )
      const existing = await loadAnnotatedProtocolTrades(userId, accountNumber)
      const withIds = derived.trades.map((trade) => ({
        ...trade,
        userId,
        id: generatePersistedTradeUUID({ ...trade, userId }),
      }))
      const attached = reattachProtocolTradeAnnotations(withIds, existing)
      const nets = summarizeFillLedgerNets(prepared.fills)
      const warnings = rebuildWarnings(
        nets,
        storedFills,
        incomingFills,
      )
      const proposed = proposedSnapshot(
        attached.trades,
        prepared.fills.length,
        derived.openSkipped,
        attached.preserved,
        attached.unmatched.length,
        nets,
      )
      if (
        attached.unmatched.length > 0 &&
        !params.allowUnmatchedAnnotations &&
        !params.dryRun
      ) {
        return {
          ...base,
          wouldDelete: before,
          proposed,
          warnings,
          error: 'UNMATCHED_ANNOTATIONS',
        }
      }

      console.log(
        `[ADMIN-RESYNC] actor=${params.actor ?? 'unknown'} userId=${userId} account=${accountNumber} dryRun=${params.dryRun} ` +
          `beforeTrades=${before.tradeCount} beforeFills=${before.fillCount} ` +
          `proposedTrades=${proposed.tradeCount} proposedFills=${proposed.fillCount} ` +
          `unmatchedAnnotations=${proposed.unmatchedAnnotations}`,
      )

      if (params.dryRun) {
        return {
          ...base,
          complete: true,
          wouldDelete: before,
          proposed,
          warnings,
        }
      }

      const unmatchedKeepIds = params.allowUnmatchedAnnotations
        ? attached.unmatched.map((row) => row.id)
        : []

      let deletedTrades = 0
      try {
        await prisma.$transaction(
          async (tx) => {
            const current = await summarizeAccountProtocolData(
              userId,
              accountNumber,
              tx as unknown as ProtocolDb,
            )
            if (
              current.fillCount !== before.fillCount ||
              current.tradeCount !== before.tradeCount
            ) {
              throw new Error('CONCURRENT_SYNC')
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

            const existingIds = existing.map((row) => row.id)
            const toDelete = existingIds.filter(
              (id) => !unmatchedKeepIds.includes(id),
            )
            if (toDelete.length > 0) {
              const deleted = await tx.trade.deleteMany({
                where: {
                  userId,
                  accountNumber,
                  tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
                  id: { in: toDelete },
                },
              })
              deletedTrades = deleted.count
              await tx.tradeAnalytics.deleteMany({
                where: { tradeId: { in: toDelete } },
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
              await tx.trade.createMany({
                data: rows,
                skipDuplicates: true,
              })
            }
          },
          { timeout: 120_000, maxWait: 15_000 },
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message === 'CONCURRENT_SYNC') {
          return { ...base, proposed, warnings, error: 'CONCURRENT_SYNC' }
        }
        console.error('[ADMIN-RESYNC] apply failed; stored ledger left unchanged', error)
        return { ...base, proposed, warnings, error: 'APPLY_FAILED' }
      }

      await invalidateCachesOnSuccess(userId)
      const afterSnapshot = await summarizeAccountProtocolData(
        userId,
        accountNumber,
      )
      const after = {
        ...afterSnapshot,
        savedCount: attached.trades.length,
        tradesCount: attached.trades.length,
      }
      console.log(
        `[ADMIN-RESYNC] actor=${params.actor ?? 'unknown'} userId=${userId} account=${accountNumber} dryRun=false ` +
          `deletedTrades=${deletedTrades} deletedFills=0 ` +
          `beforeTrades=${before.tradeCount} afterTrades=${after.tradeCount} ` +
          `saved=${after.savedCount}`,
      )
      return {
        ...base,
        complete: true,
        wouldDelete: before,
        proposed,
        warnings,
        deleted: { trades: deletedTrades, fills: 0 },
        after,
      }
    })
  } catch (error) {
    console.error('[ADMIN-RESYNC] failed before apply', error)
    return { ...base, error: 'SYNC_FAILED' }
  }
}

function proposedSnapshot(
  trades: Array<{ pnl: number }>,
  fillCount: number,
  openSkipped: number,
  annotatedPreserved: number,
  unmatchedAnnotations: number,
  nets: FillLedgerNet[],
): ProposedRebuildSnapshot {
  return {
    tradeCount: trades.length,
    pnl: trades.reduce((sum, trade) => sum + trade.pnl, 0),
    fillCount,
    openSkipped,
    annotatedPreserved,
    unmatchedAnnotations,
    nets,
  }
}

function rebuildWarnings(
  nets: FillLedgerNet[],
  storedFills: RithmicProtocolFill[],
  incomingFills: RithmicProtocolFill[],
): string[] {
  const warnings: string[] = []
  if (nets.length > 0) {
    warnings.push(
      'Terminal fill net is non-zero. A rebuild from fills alone cannot tell a live position from missing opening history; supply a broker position snapshot before altering fills.',
    )
  }
  const storedEarliest = earliestFillClock(storedFills)
  const incomingEarliest = earliestFillClock(incomingFills)
  if (
    storedEarliest != null &&
    incomingEarliest != null &&
    incomingEarliest > storedEarliest
  ) {
    warnings.push(
      'Upstream history starts later than the stored ledger. Stored fills were kept and merged so the sliding window cannot erase older rows.',
    )
  }
  return warnings
}
