'use server'

import { createClient, getUserId } from '@/server/auth'
import { saveTradesAction } from '@/server/database'
import { prisma } from '@/lib/prisma'
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
} from '@/lib/rithmic-protocol/client'
import type { RithmicProtocolAccountBalance } from '@/lib/rithmic-protocol/types'
import {
  invalidateThrottledFetch,
  withThrottledFetch,
} from '@/lib/rithmic-protocol/fetch-throttle'
import { buildTradesFromRithmicFills } from '@/lib/rithmic-protocol/fills-to-trades'
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
    if (systems.length > 0) {
      return { systems, gatewayId: gateway.id, gatewayUri }
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
): Promise<RithmicProtocolActionResult> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { error: 'USER_NOT_AUTHENTICATED' }
    }

    const normalizedHistoryStart = parseHistoryStartDate(historyStartDate)
    if (!normalizedHistoryStart) {
      return { error: 'HISTORY_START_REQUIRED' }
    }

    const gateway = resolveGateway(gatewayId)
    const resolvedUri = gatewayUriFor(gateway)
    logger.info(
      `Authenticating ${username} on ${systemName} via ${gateway.id} (${resolvedUri})`,
    )

    const result = await connectAndListAccounts({
      gatewayUri: resolvedUri,
      systemName,
      username,
      password,
    })

    if (result.accounts.length === 0) {
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
      fcmId: result.fcmId,
      ibId: result.ibId,
      uniqueUserId: result.uniqueUserId,
      historyStartDate: normalizedHistoryStart,
    }

    const loginAt = new Date()
    logger.info(
      `Login ok unique_user_id=${result.uniqueUserId ?? '(none)'} at ${loginAt.toISOString()} (UTC) accounts=${accountIds.length} historyStart=${normalizedHistoryStart}`,
    )

    const connection = await storeRithmicProtocolToken(
      JSON.stringify(stored),
      username,
    )

    await upsertAccountsForNumbers(userId, accountIds, connection.id)
    await invalidateConnectionsPageCache(userId)

    return {
      success: true,
      accountCount: accountIds.length,
      message: 'Connected',
    }
  } catch (error) {
    logger.error('authenticateRithmicProtocol failed', error)
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
    },
  })

  await invalidateConnectionsPageCache(userId)
  // Credentials or account lists just changed — the throttled balances must not
  // keep serving the pre-change snapshot for the rest of its TTL.
  invalidateThrottledFetch(userId)
  return connection
}

export async function storeRithmicProtocolToken(
  tokenJson: string,
  accountId: string,
) {
  const userId = await getUserId()
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
          await persistRithmicProtocolCredentials(
            userId,
            JSON.stringify(credentials),
            credentials.username,
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
  options?: { userId?: string; connectionId?: string },
): Promise<RithmicProtocolTradesResult> {
  const syncStats = {
    tradingAccounts: 0,
    rawFills: 0,
    closedTrades: 0,
    openTradesSkipped: 0,
    fetchFailures: 0,
  }

  try {
    const credentials = parseStoredCredentials(initialTokenJson)
    if (!credentials) {
      return { error: 'INVALID_STORED_CREDENTIALS', syncStats }
    }

    let userId = options?.userId ?? null
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
      credentials.fcmId = listed.fcmId ?? credentials.fcmId
      credentials.ibId = listed.ibId ?? credentials.ibId
      await persistRithmicProtocolCredentials(
        userId,
        JSON.stringify(credentials),
        credentials.username,
      )
    }

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

    logger.info(
      `Fetching fills for ${resolvedAccountIds.length} accounts (from ${credentials.historyStartDate ?? `${DEFAULT_LOOKBACK_DAYS}d lookback`}, ≤30d windows)`,
    )

    const { fills, uniqueUserId } = await fetchFillsForAccounts({
      gatewayUri: credentials.gatewayUri,
      systemName: credentials.systemName,
      username: credentials.username,
      password: credentials.password,
      fcmId: credentials.fcmId,
      ibId: credentials.ibId,
      accountIds: resolvedAccountIds,
      historyStartDate: credentials.historyStartDate,
      lookbackDays: DEFAULT_LOOKBACK_DAYS,
    })

    logger.info(
      `Sync fill fetch done unique_user_id=${uniqueUserId ?? credentials.uniqueUserId ?? '(none)'} fills=${fills.length}`,
    )

    syncStats.rawFills = fills.length

    const tickDetails = await getTickDetails()
    const tickBySymbol = new Map(
      tickDetails.map((t) => [
        t.ticker.toUpperCase(),
        { tickSize: t.tickSize, tickValue: t.tickValue },
      ]),
    )

    const { trades, openSkipped } = buildTradesFromRithmicFills(
      fills,
      userId,
      tickBySymbol,
    )
    syncStats.closedTrades = trades.length
    syncStats.openTradesSkipped = openSkipped

    // Stamped before saving: the fills were fetched, so the connection has synced
    // even when every trade turns out to be a duplicate. Leaving it unstamped made
    // the daily-sync cron re-run this connection on every tick.
    await prisma.connection.updateMany({
      where: {
        userId,
        service: SERVICE,
        externalId: credentials.username,
      },
      data: { lastSyncedAt: new Date() },
    })

    // saveTradesAction links every account number it sees on the trades to this
    // Connection, so accounts that only appear on fills are covered too.
    const saveResult =
      trades.length > 0
        ? await saveTradesAction(trades, { userId, connectionId })
        : null

    // Invalidate after the save so the trade-derived account links are picked
    // up, including on the duplicate/error results that return early below.
    await invalidateConnectionsPageCache(userId)

    let savedCount = 0
    if (saveResult) {
      if (saveResult.error === 'DUPLICATE_TRADES') {
        return { error: 'DUPLICATE_TRADES', syncStats, tradesCount: trades.length }
      }
      if (saveResult.error && saveResult.error !== 'NO_TRADES_ADDED') {
        return {
          error: 'SAVE_TRADES_FAILED',
          errorParams: { detail: String(saveResult.error) },
          syncStats,
        }
      }
      savedCount = saveResult.numberOfTradesAdded
    }

    return {
      processedTrades: trades,
      savedCount,
      tradesCount: trades.length,
      syncStats,
    }
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
