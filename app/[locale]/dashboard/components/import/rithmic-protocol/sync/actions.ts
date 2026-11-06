'use server'

import { createClient, getUserId } from '@/server/auth'
import { saveTradesAction } from '@/server/database'
import { prisma } from '@/lib/prisma'
import { defaultDailySyncTime } from '@/lib/daily-sync-schedule'
import {
  decryptConnectionToken,
  encryptConnectionToken,
} from '@/lib/connection-token-crypto'
import { toDecryptedConnectionViews } from '@/lib/connection-view'
import { invalidateConnectionsPageCache } from '@/app/[locale]/dashboard/connections/data'
import { upsertAccountsForNumbers } from '@/server/connections'
import { getTickDetails } from '@/server/tick-details'
import {
  connectAndListAccounts,
  fetchAccountBalances,
  fetchAvailableSystems,
  fetchFillsForAccounts,
  fetchInstrumentPositions,
} from '@/lib/rithmic-protocol/client'
import type { RithmicProtocolAccountBalance } from '@/lib/rithmic-protocol/types'
import {
  invalidateThrottledFetch,
  withThrottledFetch,
} from '@/lib/rithmic-protocol/fetch-throttle'
import {
  buildLedgerSeenIndex,
  canonicalLedgerFillIds,
  deriveTradesFromFillLedger,
  phantomProtocolTradeIds,
} from '@/lib/rithmic-protocol/fill-ledger'
import { RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
import {
  deleteUnannotatedPhantomProtocolTrades,
  loadRithmicProtocolFills,
  upsertRithmicProtocolFills,
} from '@/lib/rithmic-protocol/fill-ledger-store'
import {
  buildTradesFromRithmicFills,
  type OpeningLotSeed,
} from '@/lib/rithmic-protocol/fills-to-trades'
import {
  computeOpeningPositionChecks,
  decideOpeningSeeds,
  indexFillsByCanonicalId,
  isOpeningSeedCloseTrade,
  openingPositionKey,
  planOrdinarySyncTrades,
  reconcileBracketedSnapshots,
  retainOrdinarySyncRow,
  uncertainOpeningSymbolKeys,
  utcYyyymmddStartMs,
} from '@/lib/rithmic-protocol/opening-position'
import {
  gatewayUri as gatewayUriFor,
  getDefaultRithmicProtocolGateway,
  getFallbackSystems,
  listSelectableRithmicProtocolGateways,
  resolveGateway,
  type RithmicProtocolEnvironment,
} from '@/lib/rithmic-protocol/systems'
import type {
  RithmicProtocolActionResult,
  RithmicProtocolStoredCredentials,
  RithmicProtocolTradesResult,
} from './rithmic-protocol-types'
import { serverActor, trustedUserId, type TrustedActor } from "@/lib/api/server-actor"
import { scopeProtocolAccountIds } from '@/lib/rithmic-protocol/scope-accounts'
import {
  type ProtocolSyncLockGuard,
  protocolAccountLockKeys,
  withProtocolSyncLock,
} from '@/lib/rithmic-protocol/sync-lock'

export type RithmicProtocolSyncOptions = TrustedActor & {
  connectionId?: string
  /** When set, only these trading accounts are fetched and saved. */
  accountNumbers?: string[]
  /** Leave Connection.lastSyncedAt untouched (admin rebuilds). */
  skipConnectionStamp?: boolean
}

const SERVICE = 'rithmic-protocol'
/** Fallback lookback when a legacy connection has no `historyStartDate`. */
const DEFAULT_LOOKBACK_DAYS = Math.max(
  1,
  Number(process.env.RITHMIC_PROTOCOL_HISTORY_LOOKBACK_DAYS ?? '30'),
)

const HISTORY_START_MIN = '2013-01-01'

function parseHistoryStartDate(value: string): string | null {
  const trimmed = value.trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  const today = new Date()
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  )
  if (date.getTime() > todayUtc.getTime()) return null
  const min = new Date(`${HISTORY_START_MIN}T00:00:00.000Z`)
  if (date.getTime() < min.getTime()) return null
  return trimmed
}

const logger = {
  info: (message: string) => console.log(`[RITHMIC-PROTOCOL] ${message}`),
  warn: (message: string) => console.warn(`[RITHMIC-PROTOCOL] ${message}`),
  error: (message: string, error?: unknown) =>
    console.error(
      `[RITHMIC-PROTOCOL] ${message}`,
      error instanceof Error ? error.message : error ?? '',
    ),
}

function getSafeAuthenticationFailureCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string' && /^[A-Z0-9_]+$/.test(code)) {
      return code
    }
  }
  if (
    error instanceof Error &&
    error.message.startsWith('Rithmic login failed:')
  ) {
    return 'RITHMIC_LOGIN_REJECTED'
  }
  return 'AUTH_FAILED'
}

function parseStoredCredentials(
  tokenField: string,
): RithmicProtocolStoredCredentials | null {
  try {
    const parsed = JSON.parse(tokenField) as RithmicProtocolStoredCredentials
    if (!parsed.username || !parsed.password || !parsed.systemName) {
      return null
    }
    // Connect point comes from the stored id (legacy rows only stored the URI);
    // anything unknown falls back to the deployment default.
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

/** Connect points a user may pick from (production regions + UAT on dev). */
export async function listRithmicProtocolGateways(): Promise<{
  gateways: Array<{
    id: string
    label: string
    environment: RithmicProtocolEnvironment
  }>
  defaultGatewayId: string
}> {
  return {
    gateways: listSelectableRithmicProtocolGateways().map(
      ({ id, label, environment }) => ({ id, label, environment }),
    ),
    defaultGatewayId: getDefaultRithmicProtocolGateway().id,
  }
}

/**
 * Pre-login: ask the chosen connect point for its system names
 * (Rithmic 01, Rithmic Paper Trading, Rithmic Test, …).
 * Falls back to a static list if the probe fails.
 */
export async function listRithmicProtocolSystems(gatewayId?: string): Promise<{
  systems: string[]
  gatewayId: string
  gatewayUri: string
}> {
  const gateway = resolveGateway(gatewayId)
  const gatewayUri = gatewayUriFor(gateway)
  try {
    const systems = await fetchAvailableSystems(gatewayUri)
    if (systems.systems.length > 0) {
      return { systems: systems.systems, gatewayId: gateway.id, gatewayUri }
    }
  } catch (error) {
    logger.warn(
      `listRithmicProtocolSystems falling back for ${gateway.id}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
  return {
    systems: getFallbackSystems(gateway.id),
    gatewayId: gateway.id,
    gatewayUri,
  }
}

export async function authenticateRithmicProtocol(
  username: string,
  password: string,
  systemName: string,
  historyStartDate: string,
  gatewayId?: string,
  options?: TrustedActor,
): Promise<RithmicProtocolActionResult> {
  let authLogContext: string | null = null

  try {
    const userId = trustedUserId(options) ?? (await getUserId())
    if (!userId) {
      return { error: 'USER_NOT_AUTHENTICATED' }
    }

    const gateway = resolveGateway(gatewayId)
    const resolvedUri = gatewayUriFor(gateway)
    authLogContext =
      `userId=${userId} systemName=${JSON.stringify(systemName)} ` +
      `gatewayId=${gateway.id} environment=${gateway.environment}`

    const normalizedHistoryStart = parseHistoryStartDate(historyStartDate)
    if (!normalizedHistoryStart) {
      logger.warn(
        `Authentication rejected errorCode=HISTORY_START_REQUIRED (${authLogContext})`,
      )
      return { error: 'HISTORY_START_REQUIRED' }
    }

    logger.info(`Authenticating (${authLogContext})`)

    const probe = await fetchAvailableSystems(resolvedUri).catch((error) => {
      logger.warn(
        `System-info probe failed before login (${authLogContext}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      return { systems: [] as string[], peerAddress: undefined }
    })

    const result = await connectAndListAccounts({
      gatewayUri: resolvedUri,
      systemName,
      username,
      password,
      pinAddress: probe.peerAddress,
    })

    if (result.accounts.length === 0) {
      logger.warn(
        `Authentication failed errorCode=NO_ACCOUNTS (${authLogContext})`,
      )
      return { error: 'NO_ACCOUNTS' }
    }

    const accountIds = result.accounts.map((a) => a.accountId)
    const stored: RithmicProtocolStoredCredentials = {
      username,
      password,
      systemName,
      gatewayId: gateway.id,
      gatewayUri: resolvedUri,
      accountIds,
      accounts: result.accounts.map((a) => ({
        accountId: a.accountId,
        fcmId: a.fcmId,
        ibId: a.ibId,
      })),
      fcmId: result.fcmId,
      ibId: result.ibId,
      uniqueUserId: result.uniqueUserId,
      historyStartDate: normalizedHistoryStart,
    }

    const loginAt = new Date()
    logger.info(
      `Login ok unique_user_id=${result.uniqueUserId ?? '(none)'} at ${loginAt.toISOString()} (UTC) accounts=${accountIds.length} historyStart=${normalizedHistoryStart} (${authLogContext})`,
    )

    const connection = await storeRithmicProtocolToken(
      JSON.stringify(stored),
      username,
      serverActor(userId),
    )

    await upsertAccountsForNumbers(userId, accountIds, connection.id)
    await invalidateConnectionsPageCache(userId)

    return {
      success: true,
      accountCount: accountIds.length,
      message: 'Connected',
    }
  } catch (error) {
    const upstreamCode = getSafeAuthenticationFailureCode(error)
    logger.error(
      `authenticateRithmicProtocol failed errorCode=AUTH_FAILED upstreamCode=${upstreamCode} (${authLogContext ?? 'context=unavailable'})`,
    )
    return {
      error: 'AUTH_FAILED',
      errorParams: {
        reason: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Writes credentials for an already-resolved user. Kept module-private so the
 * exported action can never be handed a caller-supplied userId.
 */
async function persistRithmicProtocolCredentials(
  userId: string,
  tokenJson: string,
  accountId: string,
) {
  const encryptedToken = encryptConnectionToken(tokenJson)

  const connection = await prisma.connection.upsert({
    where: {
      userId_service_externalId: {
        userId,
        service: SERVICE,
        externalId: accountId,
      },
    },
    update: {
      token: encryptedToken,
      lastSyncedAt: new Date(),
      includedFeeTypes: undefined,
    },
    create: {
      userId,
      service: SERVICE,
      externalId: accountId,
      token: encryptedToken,
      lastSyncedAt: new Date(),
      dailySyncTime: defaultDailySyncTime(),
    },
  })

  await invalidateConnectionsPageCache(userId)
  // Credentials or account lists just changed — the throttled balances must not
  // keep serving the pre-change snapshot for the rest of its TTL.
  invalidateThrottledFetch(userId)
  return connection
}

/**
 * Cache listed trading-account IDs on an existing Connection without treating
 * the write as a sync. Balance reads must not bump `lastSyncedAt` or invalidate
 * the connections page — that would report the connection as just-synced in
 * the Connections UI. Updates by `connection.id` so a username/externalId
 * mismatch cannot create a second row.
 */
async function persistListedProtocolAccountIds(
  userId: string,
  connectionId: string,
  tokenJson: string,
) {
  const encryptedToken = encryptConnectionToken(tokenJson)
  await prisma.connection.updateMany({
    where: {
      id: connectionId,
      userId,
      service: SERVICE,
    },
    data: {
      token: encryptedToken,
    },
  })
}

export async function storeRithmicProtocolToken(
  tokenJson: string,
  accountId: string,
  options?: TrustedActor,
) {
  const userId = trustedUserId(options) ?? (await getUserId())
  if (!userId) throw new Error('Not authenticated')

  return persistRithmicProtocolCredentials(userId, tokenJson, accountId)
}

export async function getRithmicProtocolToken(accountId: string) {
  const userId = await getUserId()
  if (!userId) {
    return { error: 'USER_NOT_AUTHENTICATED' as const }
  }

  const row = await prisma.connection.findUnique({
    where: {
      userId_service_externalId: {
        userId,
        service: SERVICE,
        externalId: accountId,
      },
    },
  })

  if (!row?.token) {
    return { error: 'NO_TOKEN_RECONNECT' as const }
  }

  const storedTokenJson = decryptConnectionToken(row.token)
  if (!storedTokenJson) {
    return { error: 'NO_TOKEN_RECONNECT' as const }
  }

  return { storedTokenJson, lastSyncedAt: row.lastSyncedAt, connectionId: row.id }
}

export async function removeRithmicProtocolToken(accountId: string) {
  const userId = await getUserId()
  if (!userId) {
    return { error: 'USER_NOT_AUTHENTICATED' as const }
  }

  await prisma.connection.deleteMany({
    where: {
      userId,
      service: SERVICE,
      externalId: accountId,
    },
  })

  await invalidateConnectionsPageCache(userId)
  // Drop cached Solde values so the next accounts-widget fetch cannot keep
  // serving balances for the connection that was just removed.
  invalidateThrottledFetch(userId)

  return { success: true as const }
}

export async function getRithmicProtocolSynchronizations() {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { error: 'USER_NOT_AUTHENTICATED' as const }
    }

    const synchronizations = await prisma.connection.findMany({
      where: { userId, service: SERVICE },
      orderBy: { updatedAt: 'desc' },
    })

    return { synchronizations: toDecryptedConnectionViews(synchronizations) }
  } catch (error) {
    logger.error('getRithmicProtocolSynchronizations failed', error)
    return { error: 'LOAD_SYNCHRONIZATIONS_FAILED' as const }
  }
}

export type RithmicProtocolBalancesResult =
  | {
      success: true
      hasConnections: boolean
      balances: RithmicProtocolAccountBalance[]
      linkedAccountNumbers: string[]
      errors: string[]
      /** ISO timestamp of the gateway session these balances came from. */
      fetchedAt?: string
      /** True when served from the throttle cache instead of a new session. */
      fromCache?: boolean
    }
  | {
      success: false
      error: string
      hasConnections?: boolean
      balances?: RithmicProtocolAccountBalance[]
      linkedAccountNumbers?: string[]
    }

/** Automatic fetches (accounts widget mount) reuse a value younger than this. */
const BALANCES_CACHE_TTL_MS = 60_000
/** Floor between gateway sessions, including user-initiated refreshes. */
const BALANCES_MIN_REFRESH_MS = 15_000
/** Wall-clock budget across every connection, so N connections stay bounded. */
const BALANCES_TOTAL_BUDGET_MS = 45_000
/** Below this, a connection has no useful time left to log in and snapshot. */
const BALANCES_MIN_CONNECTION_BUDGET_MS = 5_000

async function fetchRithmicProtocolBalances(
  userId: string,
): Promise<RithmicProtocolBalancesResult> {
  try {
    const connections = await prisma.connection.findMany({
      where: { userId, service: SERVICE },
      select: {
        id: true,
        externalId: true,
        token: true,
        accounts: { select: { number: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (connections.length === 0) {
      return {
        success: true,
        hasConnections: false,
        balances: [],
        linkedAccountNumbers: [],
        errors: [],
      }
    }

    const balancesByAccountId = new Map<string, RithmicProtocolAccountBalance>()
    const linkedAccountNumbers = new Set<string>()
    const errors: string[] = []
    const deadline = Date.now() + BALANCES_TOTAL_BUDGET_MS

    for (const connection of connections) {
      const remainingMs = deadline - Date.now()
      if (remainingMs < BALANCES_MIN_CONNECTION_BUDGET_MS) {
        errors.push(`${connection.externalId}: skipped (balance budget spent)`)
        continue
      }

      if (!connection.token) {
        errors.push(`${connection.externalId}: missing credentials`)
        continue
      }

      let tokenJson: string | null
      try {
        tokenJson = decryptConnectionToken(connection.token)
      } catch (error) {
        errors.push(
          `${connection.externalId}: decrypt failed (${
            error instanceof Error ? error.message : String(error)
          })`,
        )
        continue
      }

      if (!tokenJson) {
        errors.push(`${connection.externalId}: empty credentials`)
        continue
      }

      const credentials = parseStoredCredentials(tokenJson)
      if (!credentials) {
        errors.push(`${connection.externalId}: invalid stored credentials`)
        continue
      }

      let accountIds =
        credentials.accountIds && credentials.accountIds.length > 0
          ? [...credentials.accountIds]
          : connection.accounts.map((account) => account.number).filter(Boolean)

      try {
        if (accountIds.length === 0) {
          const listed = await connectAndListAccounts({
            gatewayUri: credentials.gatewayUri,
            systemName: credentials.systemName,
            username: credentials.username,
            password: credentials.password,
          })
          accountIds = listed.accounts.map((account) => account.accountId)
          credentials.accountIds = accountIds
          credentials.fcmId = listed.fcmId ?? credentials.fcmId
          credentials.ibId = listed.ibId ?? credentials.ibId
          await persistListedProtocolAccountIds(
            userId,
            connection.id,
            JSON.stringify(credentials),
          )
        }

        for (const accountId of accountIds) {
          linkedAccountNumbers.add(accountId)
        }

        if (accountIds.length === 0) {
          errors.push(`${connection.externalId}: no trading accounts`)
          continue
        }

        const { balances } = await fetchAccountBalances({
          gatewayUri: credentials.gatewayUri,
          systemName: credentials.systemName,
          username: credentials.username,
          password: credentials.password,
          fcmId: credentials.fcmId,
          ibId: credentials.ibId,
          accountIds,
          deadlineMs: Math.max(0, deadline - Date.now()),
        })

        for (const balance of balances) {
          balancesByAccountId.set(balance.account_id, balance)
          linkedAccountNumbers.add(balance.account_id)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(
          `getRithmicProtocolBalancesAction failed for ${connection.externalId}`,
          error,
        )
        errors.push(`${connection.externalId}: ${message}`)
      }
    }

    return {
      success: true,
      hasConnections: true,
      balances: [...balancesByAccountId.values()],
      linkedAccountNumbers: [...linkedAccountNumbers],
      errors,
    }
  } catch (error) {
    logger.error('getRithmicProtocolBalancesAction failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'BALANCES_FETCH_FAILED',
    }
  }
}

/**
 * Live Solde Rithmic via Protocol PnL plant, using stored connection credentials.
 *
 * Every real fetch opens a WebSocket and performs a PNL_PLANT login, so results
 * are throttled per user: the accounts widget can mount as often as it likes,
 * and `force` (the refresh button) still cannot reopen the socket faster than
 * BALANCES_MIN_REFRESH_MS.
 */
export async function getRithmicProtocolBalancesAction(
  options: { force?: boolean } = {},
): Promise<RithmicProtocolBalancesResult> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { success: false, error: 'USER_NOT_AUTHENTICATED' }
    }

    const { value, fromCache, fetchedAt } = await withThrottledFetch({
      key: userId,
      force: options.force === true,
      ttlMs: BALANCES_CACHE_TTL_MS,
      minRefreshMs: BALANCES_MIN_REFRESH_MS,
      // Hard failures (auth, unexpected throw) stay uncached so the next mount
      // can retry. A success carrying per-connection `errors` is still cached:
      // the TTL bounds the staleness, and retrying a down gateway on every
      // mount is the storm this throttle exists to prevent.
      shouldCache: (result) => result.success,
      fetch: () => fetchRithmicProtocolBalances(userId),
    })

    if (!value.success) return value

    return {
      ...value,
      fromCache,
      fetchedAt: new Date(fetchedAt).toISOString(),
    }
  } catch (error) {
    logger.error('getRithmicProtocolBalancesAction failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'BALANCES_FETCH_FAILED',
    }
  }
}

export async function updateRithmicProtocolDailySyncTimeAction(
  accountId: string,
  utcTimeString: string | null,
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { success: false as const, error: 'USER_NOT_AUTHENTICATED' }
    }

    await prisma.connection.update({
      where: {
        userId_service_externalId: {
          userId,
          service: SERVICE,
          externalId: accountId,
        },
      },
      data: {
        // Clearing the interval keeps a single active schedule per connection.
        syncIntervalMinutes: null,
        dailySyncTime: utcTimeString ? new Date(utcTimeString) : null,
      },
    })

    return { success: true as const }
  } catch (error) {
    logger.error('updateRithmicProtocolDailySyncTimeAction failed', error)
    return { success: false as const, error: 'UPDATE_SYNC_TIME_FAILED' }
  }
}

export async function getRithmicProtocolTrades(
  initialTokenJson: string,
  options?: RithmicProtocolSyncOptions,
): Promise<RithmicProtocolTradesResult> {
  const syncStats = {
    tradingAccounts: 0,
    rawFills: 0,
    fillsAfterDedup: 0,
    closedTrades: 0,
    openTradesSkipped: 0,
    savedCount: 0,
    fetchFailures: 0,
    droppedByReason: {} as Record<string, number>,
  }

  try {
    const credentials = parseStoredCredentials(initialTokenJson)
    if (!credentials) {
      return { error: 'INVALID_STORED_CREDENTIALS', syncStats }
    }

    let userId = trustedUserId(options)
    if (!userId) {
      const supabase = await createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        return { error: 'USER_NOT_AUTHENTICATED', syncStats }
      }
      userId = user.id
    }
    if (!userId) {
      return { error: 'USER_NOT_AUTHENTICATED', syncStats }
    }

    const accountIds =
      credentials.accountIds && credentials.accountIds.length > 0
        ? credentials.accountIds
        : []

    // Re-list accounts when none cached
    let resolvedAccountIds = accountIds
    if (resolvedAccountIds.length === 0) {
      const listed = await connectAndListAccounts({
        gatewayUri: credentials.gatewayUri,
        systemName: credentials.systemName,
        username: credentials.username,
        password: credentials.password,
      })
      resolvedAccountIds = listed.accounts.map((a) => a.accountId)
      credentials.accountIds = resolvedAccountIds
      credentials.accounts = listed.accounts.map((a) => ({
        accountId: a.accountId,
        fcmId: a.fcmId,
        ibId: a.ibId,
      }))
      credentials.fcmId = listed.fcmId ?? credentials.fcmId
      credentials.ibId = listed.ibId ?? credentials.ibId
      await persistRithmicProtocolCredentials(
        userId,
        JSON.stringify(credentials),
        credentials.username,
      )
    }

    const scoped = scopeProtocolAccountIds(
      resolvedAccountIds,
      options?.accountNumbers,
    )
    if ('error' in scoped) {
      return { error: scoped.error, syncStats }
    }
    resolvedAccountIds = scoped.accountIds

    syncStats.tradingAccounts = resolvedAccountIds.length
    if (resolvedAccountIds.length === 0) {
      return { processedTrades: [], savedCount: 0, tradesCount: 0, syncStats }
    }

    // Attach trading accounts to the Connection on every sync so accounts that
    // only appear during fill processing (or that were created before linking)
    // leave the standalone bucket. Callers that already hold the row (the
    // daily-sync cron) pass its id so a username/externalId mismatch can't
    // silently skip the linking.
    let connectionId = options?.connectionId
    if (!connectionId) {
      const connection = await prisma.connection.findUnique({
        where: {
          userId_service_externalId: {
            userId,
            service: SERVICE,
            externalId: credentials.username,
          },
        },
        select: { id: true },
      })
      connectionId = connection?.id
    }
    if (connectionId) {
      await upsertAccountsForNumbers(userId, resolvedAccountIds, connectionId)
      // Invalidate now so the links show up even if the fill fetch below fails.
      await invalidateConnectionsPageCache(userId)
    } else {
      logger.warn(
        `No ${SERVICE} connection found for externalId=${credentials.username}; trading accounts will stay standalone`,
      )
    }

    const runLockedSync = async (
      guard: ProtocolSyncLockGuard,
    ): Promise<RithmicProtocolTradesResult> => {
    logger.info(
      `Fetching fills for ${resolvedAccountIds.length} accounts (from ${credentials.historyStartDate ?? `${DEFAULT_LOOKBACK_DAYS}d lookback`}, ≤30d windows)`,
    )

    const storedFills = await loadRithmicProtocolFills({
      userId,
      accountNumbers: resolvedAccountIds,
    })
    const seen = buildLedgerSeenIndex(storedFills)

    const snapshotRequest = {
      gatewayUri: credentials.gatewayUri,
      systemName: credentials.systemName,
      username: credentials.username,
      password: credentials.password,
      fcmId: credentials.fcmId,
      ibId: credentials.ibId,
      accountIds: resolvedAccountIds,
      accounts: credentials.accounts,
    }

    guard.throwIfLost()
    const beforeSnapshot = await fetchInstrumentPositions(snapshotRequest)

    guard.throwIfLost()
    const { rawFills, uniqueUserId, commissionRates, fillStats, fillHistory } =
      await fetchFillsForAccounts({
        gatewayUri: credentials.gatewayUri,
        systemName: credentials.systemName,
        username: credentials.username,
        password: credentials.password,
        fcmId: credentials.fcmId,
        ibId: credentials.ibId,
        accountIds: resolvedAccountIds,
        accounts: credentials.accounts,
        historyStartDate: credentials.historyStartDate,
        lookbackDays: DEFAULT_LOOKBACK_DAYS,
        seenIdentityKeys: seen.identityKeys,
      })
    guard.throwIfLost()

    const afterSnapshot = await fetchInstrumentPositions(snapshotRequest)
    const bracket = reconcileBracketedSnapshots({
      before: beforeSnapshot,
      after: afterSnapshot,
      fills: rawFills,
    })
    guard.throwIfLost()

    const accountRows = await prisma.account.findMany({
      where: { userId, number: { in: resolvedAccountIds } },
      select: { id: true, number: true },
    })
    const accountIdByNumber = new Map(
      accountRows.map((account) => [account.number, account.id]),
    )

    guard.throwIfLost()
    const ledgerWrite = await upsertRithmicProtocolFills({
      userId,
      fills: rawFills,
      stored: storedFills,
      accountIdByNumber,
      connectionId,
    })
    const prepared = deriveTradesFromFillLedger(storedFills, rawFills)

    syncStats.rawFills = fillStats.received
    syncStats.fillsAfterDedup = prepared.stats.afterDedup
    syncStats.droppedByReason = {
      ...prepared.stats.dropped,
      already_in_ledger: fillStats.skippedAlreadySeen + ledgerWrite.skipped,
      ledger_inserted: ledgerWrite.inserted,
      ledger_updated: ledgerWrite.updated,
    }

    const tickDetails = await getTickDetails()
    const tickBySymbol = new Map(
      tickDetails.map((t) => [
        t.ticker.toUpperCase(),
        { tickSize: t.tickSize, tickValue: t.tickValue },
      ]),
    )

    let openingSeeds: OpeningLotSeed[] = []
    const skippedSymbolKeys = new Set<string>()
    const fillHistoryComplete = fillHistory?.complete !== false
    const windowStartMs = fillHistory?.weeklyCloseIso
      ? Date.parse(fillHistory.weeklyCloseIso)
      : 0
    if (!fillHistoryComplete) {
      logger.warn(
        `ShowFillHistory was incomplete (windowsFailed=${fillHistory?.windowsFailed ?? '?'}); freezing instead of FIFO-starting flat`,
      )
    } else if (!bracket.ok) {
      logger.warn(
        `PnL position snapshot unavailable (${bracket.reason ?? 'incomplete'}); freezing symbols whose opening state is uncertain instead of FIFO-starting flat`,
      )
    } else {
      const checks = computeOpeningPositionChecks({
        fills: prepared.fills,
        positions: bracket.positions,
        sinceMs: Number.isFinite(windowStartMs) ? windowStartMs : undefined,
      })
      const decision = decideOpeningSeeds(
        checks,
        prepared.fills,
        Number.isFinite(windowStartMs) ? windowStartMs : 0,
      )
      logger.info(
        `positionChecks=${JSON.stringify(
          checks.map((row) => ({
            symbol: row.symbol,
            pEnd: row.pEnd,
            net: row.net,
            p0: row.p0,
          })),
        )} seeds=${decision.seeds.length} skipped=${decision.skipped.length}`,
      )
      openingSeeds = decision.seeds
      for (const skip of decision.skipped) {
        skippedSymbolKeys.add(openingPositionKey(skip.accountId, skip.symbol))
      }
      if (decision.error) {
        logger.warn(
          'OPENING_POSITION_UNKNOWN; skipping affected symbols rather than inventing lots',
        )
      }
    }

    const { trades, openSkipped, skipped } = buildTradesFromRithmicFills(
      prepared.fills,
      userId,
      tickBySymbol,
      commissionRates,
      fillHistoryComplete && bracket.ok ? { openingSeeds } : {},
    )
    for (const [reason, count] of Object.entries(skipped)) {
      syncStats.droppedByReason[reason] =
        (syncStats.droppedByReason[reason] ?? 0) + count
    }

    const uncertain = uncertainOpeningSymbolKeys({
      incomingFills: prepared.fills,
      before: beforeSnapshot,
      after: afterSnapshot,
    })
    const freezeKeys = new Set(skippedSymbolKeys)
    if (!bracket.ok || !fillHistoryComplete) {
      for (const key of uncertain.keys) freezeKeys.add(key)
    }
    const fillIndex = indexFillsByCanonicalId(prepared.fills)
    const historyStartMs = utcYyyymmddStartMs(fillHistory?.requestedStartYmd)

    const tradePlan = planOrdinarySyncTrades({
      trades,
      fills: prepared.fills,
      snapshotOk: bracket.ok,
      skippedSymbolKeys,
      uncertainSymbolKeys: uncertain.keys,
      openingStateDetermined: uncertain.determined,
      historyStartMs,
      fillHistoryComplete,
    })
    for (const [reason, count] of Object.entries(tradePlan.dropReasons)) {
      syncStats.droppedByReason[reason] =
        (syncStats.droppedByReason[reason] ?? 0) + count
    }

    const persistTrades = tradePlan.persist
    const seedCloseCount = persistTrades.filter((trade) =>
      isOpeningSeedCloseTrade(trade),
    ).length
    if (seedCloseCount > 0) {
      syncStats.droppedByReason.opening_seed_closes_excluded_from_stats =
        seedCloseCount
    }
    syncStats.closedTrades = persistTrades.length - seedCloseCount
    syncStats.openTradesSkipped = openSkipped
    const commissionZeroCount = persistTrades.filter(
      (trade) => !trade.commission,
    ).length

    const logSyncSummary = (saved: number) => {
      syncStats.savedCount = saved
      // First result line — keep this ahead of any extra per-sync chatter so
      // production log truncation still leaves the histogram.
      logger.info(
        `sync summary unique_user_id=${uniqueUserId ?? credentials.uniqueUserId ?? '(none)'} ` +
          `fillsReceived=${syncStats.rawFills} afterDedup=${syncStats.fillsAfterDedup} ` +
          `dropped=${JSON.stringify(syncStats.droppedByReason)} ` +
          `closed=${syncStats.closedTrades} openSkipped=${syncStats.openTradesSkipped} ` +
          `saved=${saved} commissionZero=${commissionZeroCount}`,
      )
    }

    // Stamped before saving: the fills were fetched, so the connection has synced
    // even when every trade turns out to be a duplicate. Leaving it unstamped made
    // the daily-sync cron re-run this connection on every tick. Frozen snapshot
    // misses must not look healthy — the cron should retry. Admin rebuilds leave
    // the row alone.
    const now = new Date()
    if (!options?.skipConnectionStamp) {
      await prisma.connection.updateMany({
        where: {
          userId,
          service: SERVICE,
          externalId: credentials.username,
        },
        data: tradePlan.stampLastSyncedAt
          ? { lastSyncedAt: now, lastSyncAttemptAt: now }
          : { lastSyncAttemptAt: now },
      })
    }
    if (!tradePlan.stampLastSyncedAt) {
      logger.warn(
        `sync degraded unique_user_id=${uniqueUserId ?? credentials.uniqueUserId ?? '(none)'} ` +
          `status=${tradePlan.syncStatus} frozenSymbols=${tradePlan.frozenSymbolCount} ` +
          `warnings=${JSON.stringify(tradePlan.warnings)}`,
      )
    }

    const ledgerFillIds = canonicalLedgerFillIds([...storedFills, ...rawFills])
    const retainIf = (row: {
      accountNumber?: string | null
      entryId?: string | null
      closeId?: string | null
      closeDate?: string | null
    }) =>
      retainOrdinarySyncRow(row, {
        freezeKeys,
        fills: fillIndex,
        historyStartMs,
      })
    const existingProtocol = await prisma.trade.findMany({
      where: {
        userId,
        accountNumber: { in: resolvedAccountIds },
        tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
      },
      select: {
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
      },
    })
    const pendingPhantomIds = tradePlan.skipPhantomDelete
      ? []
      : phantomProtocolTradeIds({
          existing: existingProtocol,
          derived: tradePlan.derivedForPhantoms,
          ledgerFillIds,
          retainIf,
        })

    // saveTradesAction links every account number it sees on the trades to this
    // Connection, so accounts that only appear on fills are covered too.
    guard.throwIfLost()
    const saveResult =
      persistTrades.length > 0
        ? await saveTradesAction(persistTrades, {
            ...serverActor(userId),
            connectionId,
            coverageExcludeTradeIds: pendingPhantomIds,
          })
        : null

    // Invalidate after the save so the trade-derived account links are picked
    // up, including on the duplicate/error results that return early below.
    await invalidateConnectionsPageCache(userId)

    let savedCount = 0
    if (saveResult) {
      // Re-syncs overlap on purpose. DUPLICATE_TRADES and NO_TRADES_ADDED
      // (commission-only backfill) are successful no-ops, not failed imports.
      if (
        saveResult.error &&
        saveResult.error !== 'NO_TRADES_ADDED' &&
        saveResult.error !== 'DUPLICATE_TRADES'
      ) {
        logSyncSummary(0)
        return {
          error: 'SAVE_TRADES_FAILED',
          errorParams: { detail: String(saveResult.error) },
          syncStats,
        }
      }
      savedCount = saveResult.numberOfTradesAdded
    }

    guard.throwIfLost()
    let phantomsRemoved = 0
    if (!tradePlan.skipPhantomDelete) {
      phantomsRemoved = await deleteUnannotatedPhantomProtocolTrades({
        userId,
        accountNumbers: resolvedAccountIds,
        derivedTrades: tradePlan.derivedForPhantoms,
        ledgerFillIds,
        retainIf,
      })
    }
    if (phantomsRemoved > 0) {
      syncStats.droppedByReason.phantoms_removed = phantomsRemoved
      logger.info(
        `Removed ${phantomsRemoved} unannotated ${SERVICE} overnight phantom trade(s)`,
      )
    }

    logSyncSummary(savedCount)

    return {
      processedTrades: persistTrades,
      savedCount,
      tradesCount: persistTrades.length,
      syncStats,
      syncStatus: tradePlan.syncStatus,
      warnings: tradePlan.warnings,
    }
    }

    return await withProtocolSyncLock(
      protocolAccountLockKeys(userId, resolvedAccountIds),
      runLockedSync,
    )
  } catch (error) {
    logger.error('getRithmicProtocolTrades failed', error)
    return {
      error: 'SYNC_FAILED',
      errorParams: {
        reason: error instanceof Error ? error.message : 'Unknown error',
      },
      syncStats,
    }
  }
}
