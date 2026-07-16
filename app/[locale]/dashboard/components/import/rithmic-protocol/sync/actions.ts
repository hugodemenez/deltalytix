'use server'

import { createClient, getUserId } from '@/server/auth'
import { saveTradesAction } from '@/server/database'
import { prisma } from '@/lib/prisma'
import { getTickDetails } from '@/server/tick-details'
import {
  connectAndListAccounts,
  fetchFillsForAccounts,
} from '@/lib/rithmic-protocol/client'
import { buildTradesFromRithmicFills } from '@/lib/rithmic-protocol/fills-to-trades'
import { resolveGatewayUri } from '@/lib/rithmic-protocol/systems'
import type {
  RithmicProtocolActionResult,
  RithmicProtocolStoredCredentials,
  RithmicProtocolTradesResult,
} from './rithmic-protocol-types'

const SERVICE = 'rithmic-protocol'
const LOOKBACK_DAYS = Math.max(
  1,
  Number(process.env.RITHMIC_PROTOCOL_HISTORY_LOOKBACK_DAYS ?? '90'),
)

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
    if (
      parsed.username &&
      parsed.password &&
      parsed.systemName &&
      parsed.gatewayUri
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export async function authenticateRithmicProtocol(
  username: string,
  password: string,
  systemName: string,
  gatewayUri?: string,
): Promise<RithmicProtocolActionResult> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return { error: 'USER_NOT_AUTHENTICATED' }
    }

    const resolvedUri = resolveGatewayUri(systemName, gatewayUri)
    logger.info(`Authenticating ${username} on ${systemName} via ${resolvedUri}`)

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
      gatewayUri: resolvedUri,
      accountIds,
      fcmId: result.fcmId,
      ibId: result.ibId,
    }

    await storeRithmicProtocolToken(JSON.stringify(stored), username)

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

export async function storeRithmicProtocolToken(
  tokenJson: string,
  accountId: string,
) {
  const userId = await getUserId()
  if (!userId) throw new Error('Not authenticated')

  await prisma.synchronization.upsert({
    where: {
      userId_service_accountId: {
        userId,
        service: SERVICE,
        accountId,
      },
    },
    update: {
      token: tokenJson,
      lastSyncedAt: new Date(),
      includedFeeTypes: undefined,
    },
    create: {
      userId,
      service: SERVICE,
      accountId,
      token: tokenJson,
      lastSyncedAt: new Date(),
    },
  })
}

export async function getRithmicProtocolToken(accountId: string) {
  const userId = await getUserId()
  if (!userId) {
    return { error: 'USER_NOT_AUTHENTICATED' as const }
  }

  const row = await prisma.synchronization.findUnique({
    where: {
      userId_service_accountId: {
        userId,
        service: SERVICE,
        accountId,
      },
    },
  })

  if (!row?.token) {
    return { error: 'NO_TOKEN_RECONNECT' as const }
  }

  return { storedTokenJson: row.token, lastSyncedAt: row.lastSyncedAt }
}

export async function removeRithmicProtocolToken(accountId: string) {
  const userId = await getUserId()
  if (!userId) {
    return { error: 'USER_NOT_AUTHENTICATED' as const }
  }

  await prisma.synchronization.deleteMany({
    where: {
      userId,
      service: SERVICE,
      accountId,
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

    const synchronizations = await prisma.synchronization.findMany({
      where: { userId, service: SERVICE },
      orderBy: { updatedAt: 'desc' },
    })

    return { synchronizations }
  } catch (error) {
    logger.error('getRithmicProtocolSynchronizations failed', error)
    return { error: 'LOAD_SYNCHRONIZATIONS_FAILED' as const }
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

    await prisma.synchronization.update({
      where: {
        userId_service_accountId: {
          userId,
          service: SERVICE,
          accountId,
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
  options?: { userId?: string },
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
      await storeRithmicProtocolToken(
        JSON.stringify(credentials),
        credentials.username,
      )
    }

    syncStats.tradingAccounts = resolvedAccountIds.length
    if (resolvedAccountIds.length === 0) {
      return { processedTrades: [], savedCount: 0, tradesCount: 0, syncStats }
    }

    logger.info(
      `Fetching fills for ${resolvedAccountIds.length} accounts (${LOOKBACK_DAYS}d lookback)`,
    )

    const fills = await fetchFillsForAccounts({
      gatewayUri: credentials.gatewayUri,
      systemName: credentials.systemName,
      username: credentials.username,
      password: credentials.password,
      fcmId: credentials.fcmId,
      ibId: credentials.ibId,
      accountIds: resolvedAccountIds,
      lookbackDays: LOOKBACK_DAYS,
    })

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

    let savedCount = 0
    if (trades.length > 0) {
      const saveResult = await saveTradesAction(trades, { userId })
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

    await prisma.synchronization.updateMany({
      where: {
        userId,
        service: SERVICE,
        accountId: credentials.username,
      },
      data: { lastSyncedAt: new Date() },
    })

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
