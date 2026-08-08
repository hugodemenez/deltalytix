'use server'

import { Trade } from '@/prisma/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { persistTradesForUser } from '@/server/trades-persist'
import { resolveActionUserId } from '@/lib/action-user'
import { ensureConnection, upsertAccountsForNumbers } from '@/server/connections'
import { decryptConnectionToken } from '@/lib/connection-token-crypto'
import { createTradeWithDefaults } from '@/lib/trade-factory'
import { generateDeterministicTradeId } from '@/lib/trade-id-utils'
import { capturePostHogEvent } from '@/lib/posthog-server'
import { invalidateConnectionsPageCache } from '@/app/[locale]/dashboard/connections/data'
import { fetchFlexStatement } from '@/lib/ibkr-flex-client'
import { IbkrErrorCode, type IbkrErrorCodeValue, type IbkrErrorParams } from '@/lib/ibkr-flex-errors'
import {
  isValidFlexQueryId,
  isValidFlexToken,
  parseIbkrCredentialsInput,
} from '@/lib/ibkr-flex-credentials'
import {
  matchExecutionsFifo,
  parseFlexStatement,
  type FlexMatchedTrade,
} from '@/lib/ibkr-flex-trades'
import type {
  IbkrConnectResult,
  IbkrStoredCredentials,
  IbkrSyncStats,
  IbkrTradesResult,
} from './ibkr-types'

const SERVICE = 'ibkr'

const logger = {
  info: (message: string) => console.log(`[IBKR] ${message}`),
  error: (message: string, error?: unknown) =>
    console.error(`[IBKR] ${message}`, error instanceof Error ? error.message : ''),
}

function parseStoredCredentials(tokenField: string | null): IbkrStoredCredentials | null {
  if (!tokenField) return null
  try {
    const decrypted = decryptConnectionToken(tokenField)
    if (!decrypted) return null
    const parsed = JSON.parse(decrypted) as Partial<IbkrStoredCredentials>
    if (typeof parsed.token === 'string' && typeof parsed.queryId === 'string') {
      return parsed as IbkrStoredCredentials
    }
    return null
  } catch {
    return null
  }
}

type LoadResult =
  | { ok: true; trades: FlexMatchedTrade[]; stats: IbkrSyncStats }
  | { ok: false; error: IbkrErrorCodeValue; errorParams?: IbkrErrorParams }

/**
 * Runs the Flex exchange and turns the statement into matched round-turns.
 * Shared by the connect preview and the sync itself so both see the same data.
 */
async function loadFlexTrades(credentials: IbkrStoredCredentials): Promise<LoadResult> {
  const statement = await fetchFlexStatement(credentials.token, credentials.queryId)
  if (!statement.ok) {
    return { ok: false, error: statement.error, errorParams: statement.errorParams }
  }

  const { executions, stats: parseStats } = parseFlexStatement(statement.xml)

  // No Trade rows at all means the query has no Trades section — a config
  // problem the user has to fix in Client Portal, not a transient failure.
  if (parseStats.tradeRows === 0) {
    return { ok: false, error: IbkrErrorCode.QUERY_HAS_NO_TRADES_SECTION }
  }

  // Rows exist but every one was undatable: the query's date format is one we
  // refuse to guess at. Tell the user exactly that instead of "no trades".
  if (executions.length === 0 && parseStats.skippedUnparseableDate > 0) {
    return {
      ok: false,
      error: IbkrErrorCode.QUERY_UNPARSEABLE_DATES,
      errorParams: { count: parseStats.skippedUnparseableDate },
    }
  }

  const trades = matchExecutionsFifo(executions)

  return {
    ok: true,
    trades,
    stats: {
      tradeRows: parseStats.tradeRows,
      executionRows: parseStats.executionRows,
      closedLotRows: parseStats.closedLotRows,
      matchedTrades: trades.length,
      skippedUnparseableDate: parseStats.skippedUnparseableDate,
      skippedIncomplete: parseStats.skippedIncomplete,
      currencies: parseStats.currencies,
      accountIds: parseStats.accountIds,
    },
  }
}

function toPrismaTrades(trades: FlexMatchedTrade[], userId: string): Trade[] {
  return trades.map((trade) => {
    const identity = {
      accountNumber: trade.accountId,
      entryId: trade.entryId,
      closeId: trade.closeId,
      instrument: trade.instrument,
      entryPrice: trade.entryPrice.toString(),
      closePrice: trade.closePrice.toString(),
      entryDate: trade.entryDate,
      closeDate: trade.closeDate,
      quantity: trade.quantity,
      side: trade.side,
      userId,
    }

    return createTradeWithDefaults({
      id: generateDeterministicTradeId(identity),
      accountNumber: trade.accountId,
      quantity: trade.quantity,
      entryId: trade.entryId,
      closeId: trade.closeId,
      instrument: trade.instrument,
      entryPrice: trade.entryPrice.toString(),
      closePrice: trade.closePrice.toString(),
      entryDate: trade.entryDate,
      closeDate: trade.closeDate,
      pnl: trade.pnl,
      commission: trade.commission,
      timeInPosition: trade.timeInPosition,
      side: trade.side,
      userId,
      tags: ['ibkr'],
    })
  })
}

/**
 * Writes matched round-turns, returning how many were new.
 *
 * Re-syncs deliberately overlap, so `DUPLICATE_TRADES` from the save layer is a
 * normal outcome and reported as "nothing new", not as a failure.
 */
interface PersistResult {
  savedCount: number
  tradesCount: number
  error?: IbkrErrorCodeValue
  errorParams?: IbkrErrorParams
}

async function persistTrades(
  trades: FlexMatchedTrade[],
  userId: string,
  connectionId: string,
): Promise<PersistResult> {
  const processedTrades = toPrismaTrades(trades, userId)
  const saveResult = await persistTradesForUser(userId, processedTrades, { connectionId })

  if (saveResult.error) {
    if (saveResult.error === 'DUPLICATE_TRADES') {
      return { savedCount: 0, tradesCount: processedTrades.length }
    }
    return {
      savedCount: 0,
      tradesCount: processedTrades.length,
      error: IbkrErrorCode.SAVE_TRADES_FAILED,
      errorParams: { detail: String(saveResult.error) },
    }
  }

  return { savedCount: saveResult.numberOfTradesAdded, tradesCount: processedTrades.length }
}

/**
 * Validates a pasted token/query ID against the live Flex service, saves it,
 * and imports whatever the statement contained.
 *
 * Importing here rather than on a follow-up click is both one step fewer and
 * one Flex round-trip fewer — IBKR allows only 10 requests per minute per
 * token, and each statement costs several.
 */
export async function connectIbkrFlexAccount(rawInput: string): Promise<IbkrConnectResult> {
  let userId: string
  try {
    userId = await getUserId()
  } catch {
    return { error: IbkrErrorCode.USER_NOT_AUTHENTICATED }
  }

  const { token, queryId } = parseIbkrCredentialsInput(rawInput)

  if (!token && !queryId) return { error: IbkrErrorCode.CREDENTIALS_REQUIRED }
  if (!token || !isValidFlexToken(token)) return { error: IbkrErrorCode.TOKEN_MALFORMED }
  if (!queryId || !isValidFlexQueryId(queryId)) {
    return { error: IbkrErrorCode.QUERY_ID_MALFORMED }
  }

  const existing = await prisma.connection.findUnique({
    where: { userId_service_externalId: { userId, service: SERVICE, externalId: queryId } },
    select: { id: true },
  })

  const result = await loadFlexTrades({ token, queryId })
  if (!result.ok) {
    return { error: result.error, errorParams: result.errorParams }
  }

  const credentials: IbkrStoredCredentials = {
    token,
    queryId,
    accountNumbers: result.stats.accountIds,
    currencies: result.stats.currencies,
  }

  const connection = await ensureConnection({
    userId,
    service: SERVICE,
    externalId: queryId,
    token: JSON.stringify(credentials),
    // Flex never reports a token's expiry, so we clear any "rejected" marker
    // here and let a future 1012/1015 response set it again.
    tokenExpiresAt: null,
  })

  // Register the IBKR account numbers so trades land against real accounts.
  if (result.stats.accountIds.length > 0) {
    await upsertAccountsForNumbers(userId, result.stats.accountIds, connection.id)
  }

  const saved =
    result.trades.length > 0
      ? await persistTrades(result.trades, userId, connection.id)
      : { savedCount: 0, tradesCount: 0 }

  // The connection itself is good even if saving hit a problem; report the
  // save failure but keep the credentials so the user can retry the sync.
  if (saved.error) {
    return {
      success: true,
      accountId: queryId,
      stats: result.stats,
      savedCount: 0,
      tradesCount: saved.tradesCount,
      error: saved.error,
      errorParams: saved.errorParams,
    }
  }

  await capturePostHogEvent({
    distinctId: userId,
    event: 'integration_connected',
    properties: {
      integration: 'ibkr',
      is_first_connection: !existing,
      matched_trades: result.stats.matchedTrades,
      saved_trades: saved.savedCount,
      account_count: result.stats.accountIds.length,
    },
  })

  await invalidateConnectionsPageCache(userId)

  logger.info(
    `Connected query ${queryId}: imported ${saved.savedCount}/${result.stats.matchedTrades} trades across ${result.stats.accountIds.length} account(s)`,
  )

  return {
    success: true,
    accountId: queryId,
    stats: result.stats,
    savedCount: saved.savedCount,
    tradesCount: saved.tradesCount,
  }
}

export async function syncIbkrAccount(
  accountId: string,
  options?: { userId?: string },
): Promise<IbkrTradesResult> {
  let resolvedUserId: string
  try {
    resolvedUserId = await resolveActionUserId(options?.userId)
  } catch {
    return { error: IbkrErrorCode.USER_NOT_AUTHENTICATED }
  }

  const connection = await prisma.connection.findUnique({
    where: {
      userId_service_externalId: {
        userId: resolvedUserId,
        service: SERVICE,
        externalId: accountId,
      },
    },
  })

  if (!connection) return { error: IbkrErrorCode.NO_CREDENTIALS_RECONNECT }

  const credentials = parseStoredCredentials(connection.token)
  if (!credentials) return { error: IbkrErrorCode.INVALID_STORED_CREDENTIALS }

  const result = await loadFlexTrades(credentials)
  if (!result.ok) {
    if (
      result.error === IbkrErrorCode.FLEX_TOKEN_EXPIRED ||
      result.error === IbkrErrorCode.FLEX_TOKEN_INVALID
    ) {
      // A past expiry is how the rest of the app reads "needs reconnecting".
      await prisma.connection.updateMany({
        where: { userId: resolvedUserId, service: SERVICE, externalId: accountId },
        data: { tokenExpiresAt: new Date(0) },
      })
    }
    return { error: result.error, errorParams: result.errorParams }
  }

  // Refresh the cached display data and the sync timestamp even when the
  // statement was empty — the connection is healthy, it just had no activity.
  await ensureConnection({
    userId: resolvedUserId,
    service: SERVICE,
    externalId: accountId,
    token: JSON.stringify({
      ...credentials,
      accountNumbers: result.stats.accountIds,
      currencies: result.stats.currencies,
    }),
    tokenExpiresAt: null,
  })

  if (result.stats.accountIds.length > 0) {
    await upsertAccountsForNumbers(resolvedUserId, result.stats.accountIds, connection.id)
  }

  if (result.trades.length === 0) {
    const error =
      result.stats.executionRows > 0
        ? IbkrErrorCode.OPEN_POSITIONS_ONLY
        : IbkrErrorCode.NO_TRADES_IN_RANGE
    return { savedCount: 0, tradesCount: 0, stats: result.stats, error }
  }

  const saved = await persistTrades(result.trades, resolvedUserId, connection.id)

  if (saved.error) {
    logger.error(`Failed to save trades for query ${accountId}: ${saved.errorParams?.detail}`)
    return {
      error: saved.error,
      errorParams: saved.errorParams,
      tradesCount: saved.tradesCount,
      stats: result.stats,
    }
  }

  logger.info(
    `Synced query ${accountId}: saved ${saved.savedCount}/${saved.tradesCount} trades`,
  )

  return {
    savedCount: saved.savedCount,
    tradesCount: saved.tradesCount,
    stats: result.stats,
  }
}

export async function getIbkrConnections() {
  try {
    const userId = await getUserId()
    const connections = await prisma.connection.findMany({
      where: { userId, service: SERVICE },
      orderBy: { lastSyncedAt: 'desc' },
    })
    return { connections }
  } catch (error) {
    logger.error('Failed to list connections', error)
    return { error: IbkrErrorCode.LOAD_SYNCHRONIZATIONS_FAILED }
  }
}

export async function removeIbkrConnection(accountId: string) {
  try {
    const userId = await getUserId()
    await prisma.connection.deleteMany({
      where: { userId, service: SERVICE, externalId: accountId },
    })
    return { success: true }
  } catch (error) {
    logger.error('Failed to remove connection', error)
    return { error: IbkrErrorCode.DELETE_SYNC_FAILED }
  }
}

/**
 * Sets the daily sync time. IBKR statements cover a rolling window rather than
 * only today, so this is a convenience rather than a requirement — a missed run
 * is picked up by the next one.
 */
export async function updateIbkrDailySyncTimeAction(
  accountId: string,
  utcTimeString: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getUserId()
    await prisma.connection.updateMany({
      where: { userId, service: SERVICE, externalId: accountId },
      data: { dailySyncTime: utcTimeString ? new Date(utcTimeString) : null },
    })
    await invalidateConnectionsPageCache(userId)
    return { success: true }
  } catch (error) {
    logger.error('Failed to update daily sync time', error)
    return { success: false, error: IbkrErrorCode.UPDATE_SYNC_TIME_FAILED }
  }
}
