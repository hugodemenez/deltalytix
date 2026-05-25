'use server'

import { createClient } from '@/server/auth'
import { saveTradesAction } from '@/server/database'
import { Trade } from '@/prisma/generated/prisma/client'
import { generateDeterministicTradeId } from '@/lib/trade-id-utils'
import { prisma } from '@/lib/prisma'
import { formatTimestamp } from '@/lib/date-utils'
import { createTradeWithDefaults } from '@/lib/trade-factory'
import { getUserId } from '@/server/auth'
import {
  coerceDxFeedHistoricalHostForSync,
  normalizeDxFeedHistoricalHost,
  resolveDxFeedHistoricalHost,
} from '@/lib/dxfeed-historical-host'
import { DxFeedErrorCode } from '@/lib/dxfeed-errors'
import {
  authPropfirmMatchesSelection,
  buildHistoricalHostForPropFirm,
  getDxFeedPropFirm,
} from '@/lib/dxfeed-propfirms'
import type {
  DxFeedLoginRequest,
  DxFeedLoginResponse,
  DxFeedStoredCredentials,
  DxFeedAccountListResponse,
  DxFeedTradesResponse,
  DxFeedReportTrade,
  DxFeedActionResult,
  DxFeedTradesResult,
  DxFeedTradingAccount,
} from './dxfeed-types'

const DXFEED_AUTH_URL = process.env.DXFEED_AUTH_URL
const DXFEED_PLATFORM_KEY = process.env.DXFEED_PLATFORM_KEY

const IS_DEV = process.env.NODE_ENV === 'development' || process.env.DXFEED_DEBUG === 'true'
const DXFEED_ENVIRONMENT = Number(
  process.env.DXFEED_ENVIRONMENT ?? (process.env.NODE_ENV === 'production' ? '0' : '1'),
)
const DXFEED_HISTORY_LOOKBACK_DAYS = Math.max(
  1,
  Number(process.env.DXFEED_HISTORY_LOOKBACK_DAYS ?? '364'),
)

const logger = {
  debug: (message: string, data?: any) => {
    if (IS_DEV) console.log(`[DXFEED-DEBUG] ${message}`, data ?? '')
  },
  info: (message: string) => {
    console.log(`[DXFEED] ${message}`)
  },
  warn: (message: string) => {
    console.warn(`[DXFEED] ${message}`)
  },
  error: (message: string, error?: unknown) => {
    console.error(`[DXFEED] ${message}`, error instanceof Error ? error.message : '')
  },
}

/**
 * Parse the JSON stored in the Synchronization.token field
 * back into { accessToken, historicalHost }.
 */
function parseStoredCredentials(tokenField: string): DxFeedStoredCredentials | null {
  try {
    const parsed = JSON.parse(tokenField)
    if (parsed.accessToken && parsed.historicalHost) {
      return parsed as DxFeedStoredCredentials
    }
    return null
  } catch {
    return null
  }
}

function buildHistoricalAuthHeaders(accessToken: string): HeadersInit {
  return {
    // The report API expects the raw tradingRestReportToken, not a Bearer token.
    'Authorization': accessToken,
    'Accept': 'application/json',
  }
}

function extractArrayPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[]
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data
  }

  return []
}

function extractApiErrorMessage(payload: unknown): string | null {
  if (!payload) return null

  if (Array.isArray(payload)) {
    const firstError = payload.find(
      (item): item is { message?: string } => !!item && typeof item === 'object' && 'message' in item,
    )
    return firstError?.message ?? null
  }

  if (typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message
    return typeof message === 'string' ? message : null
  }

  return null
}

/**
 * Authenticate with DxFeed using username/password.
 * The auth response returns a token (body) and a host header
 * that must be used as the base URL for the Historical API.
 */
export async function authenticateDxFeed(
  login: string,
  password: string,
  propFirmId: string,
): Promise<DxFeedActionResult> {
  try {
    if (!DXFEED_AUTH_URL || !DXFEED_PLATFORM_KEY) {
      return { error: DxFeedErrorCode.CONFIG_NOT_SET }
    }

    if (!propFirmId?.trim()) {
      return { error: DxFeedErrorCode.PROP_FIRM_REQUIRED }
    }

    const propFirm = getDxFeedPropFirm(propFirmId)
    if (!propFirm?.enabled) {
      return { error: DxFeedErrorCode.PROP_FIRM_UNSUPPORTED }
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: DxFeedErrorCode.USER_NOT_AUTHENTICATED }
    }

    const body: DxFeedLoginRequest = {
      login,
      password,
      environment: DXFEED_ENVIRONMENT, // 0=Production, 1=Staging (demo)
      version: 3,
      withDetails: true,
      connectOnlyTrading: true,
    }

    logger.info('Sending auth request')

    const response = await fetch(DXFEED_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PltfKey': DXFEED_PLATFORM_KEY,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      logger.error(`Auth request failed with status ${response.status}`)
      return {
        error: DxFeedErrorCode.AUTH_HTTP_ERROR,
        errorParams: {
          status: response.status,
          detail: text?.slice(0, 200) || response.statusText,
        },
      }
    }

    const data: DxFeedLoginResponse = await response.json()

    if (data.status !== 'OK' || !data.token) {
      return {
        error: DxFeedErrorCode.AUTH_REJECTED,
        errorParams: { reason: data.reason || 'Authentication failed' },
      }
    }

    if (!authPropfirmMatchesSelection(data.propfirmName, propFirm)) {
      return {
        error: DxFeedErrorCode.AUTH_PROP_FIRM_MISMATCH,
        errorParams: {
          authPropfirm: data.propfirmName ?? '—',
          selectedPropfirm: propFirm.name,
        },
      }
    }

    const historicalHost = resolveDxFeedHistoricalHost(data, response.headers, { propFirmId: propFirm.id })

    if (!historicalHost) {
      logger.warn('Could not derive historical host from auth response (check prop firm mapping)')
      return {
        error: DxFeedErrorCode.HISTORICAL_HOST_UNRESOLVED,
        errorParams: { propfirm: propFirm.name },
      }
    }

    logger.info(`Auth successful for ${propFirm.name}`)

    const reportAccessToken = data.tradingRestReportToken || data.token
    const accounts = historicalHost
      ? await getDxFeedAccounts(reportAccessToken, historicalHost)
      : []
    const accountNumbers = accounts.map(
      (a) => a.accountHeader || a.accountReference || a.accountId.toString(),
    )

    const credentials: DxFeedStoredCredentials = {
      accessToken: reportAccessToken,
      historicalHost,
      accountNumbers,
      propFirmId: propFirm.id,
      propfirmName: data.propfirmName,
    }

    const storeResult = await storeDxFeedToken(JSON.stringify(credentials), login)
    if (storeResult.error) {
      logger.warn('Failed to store token')
    }

    return { success: true }
  } catch (error) {
    logger.error('Authentication error:', error)
    return { error: DxFeedErrorCode.AUTH_UNEXPECTED }
  }
}

export async function getDxFeedAccounts(
  accessToken: string,
  historicalHost: string,
): Promise<DxFeedTradingAccount[]> {
  try {
    if (!historicalHost) {
      logger.error('No historical host provided')
      return []
    }

    const baseUrl = historicalHost.endsWith('/') ? historicalHost.slice(0, -1) : historicalHost
    const url = `${baseUrl}/api/historical/TradingAccount/List`

    logger.debug('Fetching accounts from:', url)

    const response = await fetch(url, {
      headers: buildHistoricalAuthHeaders(accessToken),
    })

    if (!response.ok) {
      const text = await response.text()
      logger.warn(`Failed to fetch accounts (status ${response.status}): ${text}`)
      return []
    }

    const data: DxFeedAccountListResponse | DxFeedTradingAccount[] = await response.json()
    return extractArrayPayload<DxFeedTradingAccount>(data)
  } catch (error) {
    logger.error('Error fetching DxFeed accounts:', error)
    return []
  }
}

/** DxFeed may send epoch seconds or milliseconds depending on endpoint/version. */
function normalizeDxFeedEpochMs(value: number | null | undefined): number {
  if (value == null || value <= 0) return 0
  if (value < 1e12) return Math.round(value * 1000)
  return Math.round(value)
}

function isClosedDxFeedReportTrade(rt: DxFeedReportTrade): boolean {
  const exitMs = normalizeDxFeedEpochMs(rt.exitDate)
  if (exitMs > 0) return true
  if (rt.isCloseTrade === true) return true
  return false
}

function extractInstrumentSymbol(contract: DxFeedReportTrade['contract']): string {
  if (!contract) return 'Unknown'

  const raw = (contract.symbol || contract.contractName || '').toUpperCase()
  const withoutExchange = raw.split(':')[0]
  const clean = withoutExchange.startsWith('/') ? withoutExchange.slice(1) : withoutExchange

  // Match futures: letters followed by month code and digits (e.g. ESZ25 -> ES)
  const monthCodeMatch = clean.match(/^([A-Z]+?)[FGHJKMNQUVXZ]\d+$/i)
  if (monthCodeMatch) {
    return monthCodeMatch[1].toUpperCase()
  }

  const lettersOnly = clean.replace(/[^A-Z]/g, '')
  return lettersOnly || 'Unknown'
}

function buildTradesFromDxFeedReport(
  reportTrades: DxFeedReportTrade[],
  accountLabel: string,
  userId: string,
): { trades: Trade[]; openSkipped: number } {
  const trades: Trade[] = []
  let openSkipped = 0

  for (const rt of reportTrades) {
    try {
      if (!isClosedDxFeedReportTrade(rt)) {
        openSkipped += 1
        logger.debug(`Skipping open position tradeId=${rt.tradeId}`)
        continue
      }

      const instrument = extractInstrumentSymbol(rt.contract)
      const side = rt.quantity > 0 ? 'Long' : 'Short'
      const quantity = Math.abs(rt.quantity)

      const entryMs = normalizeDxFeedEpochMs(rt.entryDate)
      const exitMs = normalizeDxFeedEpochMs(rt.exitDate)
      const entryDate = new Date(entryMs)
      const exitDate = new Date(exitMs)
      const durationSeconds = Math.max(0, Math.round((exitDate.getTime() - entryDate.getTime()) / 1000))

      // App stores gross PnL in `pnl`; net = pnl - commission. DxFeed netPl is already after fees.
      const pnl = rt.grossPl
      const commission = Math.abs(rt.grossPl - rt.netPl)

      const tradeData = {
        accountNumber: accountLabel,
        entryId: `dxfeed_${rt.tradeId}_entry`,
        closeId: `dxfeed_${rt.tradeId}_exit`,
        instrument,
        entryPrice: rt.entryPrice.toString(),
        closePrice: rt.exitPrice.toString(),
        entryDate: formatTimestamp(entryDate.toISOString()),
        closeDate: formatTimestamp(exitDate.toISOString()),
        quantity,
        side,
        userId,
      }

      const trade = createTradeWithDefaults({
        id: generateDeterministicTradeId(tradeData),
        accountNumber: accountLabel,
        quantity,
        entryId: `dxfeed_${rt.tradeId}_entry`,
        closeId: `dxfeed_${rt.tradeId}_exit`,
        instrument,
        entryPrice: rt.entryPrice.toString(),
        closePrice: rt.exitPrice.toString(),
        entryDate: formatTimestamp(entryDate.toISOString()),
        closeDate: formatTimestamp(exitDate.toISOString()),
        pnl,
        timeInPosition: durationSeconds,
        userId,
        side,
        commission: Math.abs(commission),
        tags: ['dxfeed'],
      })

      trades.push(trade)

      logger.debug(`Created trade: ${instrument} ${side} ${quantity} @ ${rt.entryPrice} -> ${rt.exitPrice} = $${pnl.toFixed(2)}`)
    } catch (error) {
      logger.error(`Error processing DxFeed trade ${rt.tradeId}:`, error)
    }
  }

  return { trades, openSkipped }
}

export async function getDxFeedTrades(
  initialTokenJson: string,
  options?: { userId?: string },
): Promise<DxFeedTradesResult> {
  try {
    const credentials = parseStoredCredentials(initialTokenJson)
    if (!credentials) {
      return { error: DxFeedErrorCode.INVALID_STORED_CREDENTIALS }
    }

    const propFirm = getDxFeedPropFirm(credentials.propFirmId)
    if (!propFirm) {
      return { error: DxFeedErrorCode.MISSING_PROP_FIRM_RECONNECT }
    }

    const { accessToken } = credentials
    // Prefer host from connect; remap mistaken trading WSS hosts; fall back to catalog.
    const historicalHost = coerceDxFeedHistoricalHostForSync(credentials.historicalHost, propFirm)

    let userId = options?.userId ?? null
    if (!userId) {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return { error: DxFeedErrorCode.USER_NOT_AUTHENTICATED }
      }
      userId = user.id
    }

    let storedTokenJson = initialTokenJson
    const baseUrl = historicalHost.endsWith('/') ? historicalHost.slice(0, -1) : historicalHost

    logger.info('Fetching DxFeed accounts...')
    const accounts = await getDxFeedAccounts(accessToken, historicalHost)

    const accountNumbers = accounts.map(
      (a) => a.accountHeader || a.accountReference || a.accountId.toString(),
    )
    if (accountNumbers.length > 0) {
      const updatedCreds: DxFeedStoredCredentials = {
        ...credentials,
        historicalHost,
        accountNumbers,
      }
      const updatedJson = JSON.stringify(updatedCreds)
      await updateStoredCredentials(userId, storedTokenJson, updatedJson)
      storedTokenJson = updatedJson
    }

    const syncStats = {
      tradingAccounts: accounts.length,
      rawTrades: 0,
      closedTrades: 0,
      openTradesSkipped: 0,
      fetchFailures: 0,
    }

    if (accounts.length === 0) {
      const cachedAccounts = credentials.accountNumbers?.length ?? 0
      if (cachedAccounts > 0) {
        return {
          error: DxFeedErrorCode.SYNC_ACCOUNTS_UNAVAILABLE,
          errorParams: { count: cachedAccounts },
          syncStats,
        }
      }
      await updateLastSyncedAt(userId, storedTokenJson)
      return { processedTrades: [], savedCount: 0, tradesCount: 0, syncStats }
    }

    logger.info(`Found ${accounts.length} accounts, fetching trades...`)

    const allTrades: Trade[] = []

    for (const account of accounts) {
      const accountLabel = account.accountHeader || account.accountReference || account.accountId.toString()
      const historicalAccountId = account.accountReference || account.accountId.toString()

      const endDt = new Date()
      const startDt = new Date(endDt.getTime() - DXFEED_HISTORY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)

      const tradesUrl = new URL(
        `${baseUrl}/api/historical/TradingAccount/Trades/${historicalAccountId}`,
      )
      tradesUrl.searchParams.set('startDt', startDt.toISOString())
      tradesUrl.searchParams.set('endDt', endDt.toISOString())

      const response = await fetch(tradesUrl.toString(), {
        headers: buildHistoricalAuthHeaders(accessToken),
      })

      if (!response.ok) {
        const text = await response.text()
        syncStats.fetchFailures += 1
        logger.warn(
          `Failed to fetch trades for account ${accountLabel} (status ${response.status}): ${text}`,
        )
        continue
      }

      const data: DxFeedTradesResponse | DxFeedReportTrade[] | Array<{ message?: string }> =
        await response.json()
      const apiError = extractApiErrorMessage(data)
      if (apiError) {
        syncStats.fetchFailures += 1
        logger.warn(`DxFeed returned an error for account ${accountLabel}: ${apiError}`)
        continue
      }

      const reportTrades = extractArrayPayload<DxFeedReportTrade>(data)
      syncStats.rawTrades += reportTrades.length

      logger.info(`Received ${reportTrades.length} trades for account ${accountLabel}`)

      const { trades, openSkipped } = buildTradesFromDxFeedReport(reportTrades, accountLabel, userId)
      syncStats.openTradesSkipped += openSkipped
      allTrades.push(...trades)
    }

    syncStats.closedTrades = allTrades.length

    await updateLastSyncedAt(userId, storedTokenJson)

    if (syncStats.fetchFailures > 0 && syncStats.fetchFailures >= accounts.length) {
      return {
        error: DxFeedErrorCode.SYNC_FETCH_FAILED,
        errorParams: { failures: syncStats.fetchFailures, total: accounts.length },
        syncStats,
      }
    }

    if (allTrades.length === 0) {
      logger.info(`No closed trades to save: ${JSON.stringify(syncStats)}`)
      return { processedTrades: [], savedCount: 0, tradesCount: 0, syncStats }
    }

    logger.info(`Saving ${allTrades.length} trades...`)
    const saveResult = await saveTradesAction(allTrades, { userId })

    if (saveResult.error) {
      if (saveResult.error === 'DUPLICATE_TRADES') {
        return {
          error: DxFeedErrorCode.DUPLICATE_TRADES,
          processedTrades: allTrades,
          tradesCount: allTrades.length,
          syncStats,
        }
      }
      logger.error(`Failed to save trades: ${saveResult.error}`)
      return {
        error: DxFeedErrorCode.SAVE_TRADES_FAILED,
        errorParams: { detail: saveResult.error },
        processedTrades: allTrades,
        tradesCount: allTrades.length,
        syncStats,
      }
    }

    logger.info(`Saved ${saveResult.numberOfTradesAdded} trades`)

    return {
      processedTrades: allTrades,
      savedCount: saveResult.numberOfTradesAdded,
      tradesCount: allTrades.length,
      syncStats,
    }
  } catch (error) {
    logger.error('Failed to get DxFeed trades:', error)
    return { error: DxFeedErrorCode.SYNC_FAILED }
  }
}

async function updateLastSyncedAt(userId: string, storedTokenJson: string) {
  await prisma.synchronization.updateMany({
    where: {
      userId,
      service: 'dxfeed',
      token: storedTokenJson,
    },
    data: {
      lastSyncedAt: new Date(),
    },
  })
}

async function updateStoredCredentials(userId: string, oldTokenJson: string, newTokenJson: string) {
  await prisma.synchronization.updateMany({
    where: {
      userId,
      service: 'dxfeed',
      token: oldTokenJson,
    },
    data: {
      token: newTokenJson,
    },
  })
}

export async function storeDxFeedToken(
  tokenJson: string,
  accountId: string = 'default',
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'User not authenticated' }
    }

    await prisma.synchronization.upsert({
      where: {
        userId_service_accountId: {
          userId: user.id,
          service: 'dxfeed',
          accountId,
        },
      },
      update: {
        token: tokenJson,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
        includedFeeTypes: undefined, // DxFeed has no fee differentiator
      },
      create: {
        userId: user.id,
        service: 'dxfeed',
        accountId,
        token: tokenJson,
        lastSyncedAt: new Date(),
        includedFeeTypes: undefined, // DxFeed has no fee differentiator
      },
    })

    return { success: true }
  } catch (error) {
    logger.error('Failed to store DxFeed token:', error)
    return { error: 'Failed to store token' }
  }
}

export async function getDxFeedToken(accountId: string = 'default') {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'User not authenticated' }
    }

    const syncData = await prisma.synchronization.findUnique({
      where: {
        userId_service_accountId: {
          userId: user.id,
          service: 'dxfeed',
          accountId,
        },
      },
    })

    if (!syncData?.token) {
      return { error: 'No DxFeed token found' }
    }

    return {
      storedTokenJson: syncData.token,
      accountId: syncData.accountId,
    }
  } catch (error) {
    logger.error('Failed to get DxFeed token:', error)
    return { error: 'Failed to get token' }
  }
}

export async function removeDxFeedToken(accountId?: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'User not authenticated' }
    }

    const whereClause: any = {
      userId: user.id,
      service: 'dxfeed',
    }

    if (accountId) {
      whereClause.accountId = accountId
    }

    await prisma.synchronization.deleteMany({
      where: whereClause,
    })

    return { success: true }
  } catch (error) {
    logger.error('Failed to remove DxFeed token:', error)
    return { error: 'Failed to remove token' }
  }
}

export async function getDxFeedSynchronizations() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'User not authenticated' }
    }

    const synchronizations = await prisma.synchronization.findMany({
      where: {
        userId: user.id,
        service: 'dxfeed',
      },
      orderBy: {
        lastSyncedAt: 'desc',
      },
    })

    return { synchronizations }
  } catch (error) {
    logger.error('Failed to get DxFeed synchronizations:', error)
    return { error: 'Failed to get synchronizations' }
  }
}

export async function updateDxFeedDailySyncTimeAction(
  accountId: string,
  utcTimeString: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getUserId()

    let syncDateTime: Date | null = null
    if (utcTimeString) {
      syncDateTime = new Date(utcTimeString)
    }

    await prisma.synchronization.updateMany({
      where: {
        userId,
        service: 'dxfeed',
        accountId,
      },
      data: {
        dailySyncTime: syncDateTime,
      },
    })

    return { success: true }
  } catch (error) {
    logger.error('Error updating daily sync time:', error)
    return { success: false, error: DxFeedErrorCode.UPDATE_SYNC_TIME_FAILED }
  }
}
