import 'server-only'
import { RithmicProtocolClient } from './client'
import {
  indexProductRmsCommissionRates,
  type ProductRmsCommissionRow,
} from './commission-rates'
import { markFillSource } from './dedupe-fills'
import {
  buildUtcFillHistoryWindows,
  parseUtcYyyyMmDd,
  toUtcYyyymmdd,
} from './cme-session'
import { SHOW_FILL_HISTORY_MAX_WINDOW_DAYS, replayWindowStartSsboe } from './lookback'
import type { RithmicProtocolFill } from './types'

export class AdminFillFetchError extends Error {
  constructor(
    public readonly code:
      | 'ACCOUNT_NOT_FOUND'
      | 'FETCH_FAILED'
      | 'FILL_FETCH_TIMEOUT'
      | 'INCOMPLETE_FILL_HISTORY',
    message: string,
  ) {
    super(message)
    this.name = 'AdminFillFetchError'
  }
}

function classifyFetchError(error: unknown): AdminFillFetchError {
  if (error instanceof AdminFillFetchError) return error
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return new AdminFillFetchError('FILL_FETCH_TIMEOUT', message)
  }
  return new AdminFillFetchError('FETCH_FAILED', message)
}

function toYyyymmddNumber(d: Date): number {
  return Number(toUtcYyyymmdd(d))
}

/**
 * Fail-closed fill history for the admin rebuild. Any window error, reject,
 * timeout, or replay failure aborts — nothing is swallowed into a partial
 * ledger the way ordinary sync's `fetchFillsForAccounts` does.
 */
export async function fetchAdminRebuildFills(params: {
  gatewayUri: string
  systemName: string
  username: string
  password: string
  fcmId?: string
  ibId?: string
  accountId: string
  accounts?: Array<{ accountId: string; fcmId?: string; ibId?: string }>
  historyStartDate: string
}): Promise<{
  rawFills: RithmicProtocolFill[]
  commissionRates: Map<string, number>
  listedAccountIds: string[]
  historyStartYmd: string
  windowsFetched: number
}> {
  const start = parseUtcYyyyMmDd(params.historyStartDate)
  if (!start) {
    throw new AdminFillFetchError(
      'FETCH_FAILED',
      `Invalid historyStartDate ${params.historyStartDate}`,
    )
  }
  const end = new Date()
  const windows = buildUtcFillHistoryWindows(
    start,
    end,
    SHOW_FILL_HISTORY_MAX_WINDOW_DAYS,
  )
  const client = new RithmicProtocolClient()
  const fills: RithmicProtocolFill[] = []
  const rmsRows: ProductRmsCommissionRow[] = []
  try {
    await client.connect(params.gatewayUri)
    const login = await client.login({
      systemName: params.systemName,
      username: params.username,
      password: params.password,
    })
    const info = await client.loginInfo()
    const loginFcmId = params.fcmId || info.fcmId || login.fcmId
    const loginIbId = params.ibId || info.ibId || login.ibId

    let listed: Array<{ accountId: string; fcmId?: string; ibId?: string }> = []
    try {
      listed = await client.listAccounts({
        fcmId: loginFcmId,
        ibId: loginIbId,
        userType: info.userType,
      })
    } catch (error) {
      throw classifyFetchError(error)
    }
    const listedAccountIds = listed.map((account) => account.accountId)
    if (
      listedAccountIds.length > 0 &&
      !listedAccountIds.includes(params.accountId)
    ) {
      throw new AdminFillFetchError(
        'ACCOUNT_NOT_FOUND',
        `Broker account list does not include ${params.accountId}`,
      )
    }

    const meta =
      listed.find((account) => account.accountId === params.accountId) ??
      params.accounts?.find((account) => account.accountId === params.accountId)
    const fcmId = meta?.fcmId || loginFcmId
    const ibId = meta?.ibId || loginIbId

    try {
      const productRms = await client.getProductRmsInfo({
        fcmId,
        ibId,
        accountId: params.accountId,
      })
      rmsRows.push(...productRms)
    } catch (error) {
      console.warn(
        '[ADMIN-RESYNC] Product RMS info failed; continuing with empty commission rates',
        error instanceof Error ? error.message : error,
      )
    }

    for (const window of windows) {
      try {
        const accountFills = await client.getFillHistory({
          fcmId,
          ibId,
          accountId: params.accountId,
          startDateYyyymmdd: toYyyymmddNumber(window.start),
          endDateYyyymmdd: toYyyymmddNumber(window.end),
        })
        fills.push(...markFillSource(accountFills, 'history'))
      } catch (error) {
        throw classifyFetchError(error)
      }
    }

    const finishSsboe = Math.floor(Date.now() / 1000) + 60
    try {
      const replayed = await client.replayExecutions({
        fcmId,
        ibId,
        accountId: params.accountId,
        startSsboe: replayWindowStartSsboe(finishSsboe, 2),
        finishSsboe,
      })
      fills.push(...markFillSource(replayed, 'replay'))
    } catch (error) {
      throw new AdminFillFetchError(
        'INCOMPLETE_FILL_HISTORY',
        error instanceof Error ? error.message : String(error),
      )
    }

    return {
      rawFills: fills,
      commissionRates: indexProductRmsCommissionRates(rmsRows),
      listedAccountIds,
      historyStartYmd: params.historyStartDate,
      windowsFetched: windows.length,
    }
  } catch (error) {
    throw classifyFetchError(error)
  } finally {
    await client.close()
  }
}
