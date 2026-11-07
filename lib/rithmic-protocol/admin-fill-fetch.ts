import 'server-only'
import { RithmicProtocolClient, type FillHistoryObserve } from './client'
import {
  indexProductRmsCommissionRates,
  type ProductRmsCommissionRow,
} from './commission-rates'
import { markFillSource } from './dedupe-fills'
import {
  buildUtcFillHistoryWindows,
  parseUtcYyyyMmDd,
  toUtcYyyyMmDd,
  toUtcYyyymmdd,
  utcCalendarDayAfter,
} from './cme-session'
import {
  SHOW_FILL_HISTORY_MAX_WINDOW_DAYS,
  replayWindowStartSsboe,
  resolveReplayLookbackDays,
} from './lookback'
import { orderHistoryFallbackPlan } from './history-fallback'
import {
  type AdminFillDropReason,
  type AdminFillWindowCoverage,
  fillDateYyyymmdd,
  observeMappedFillRow,
  windowResolvedAfterFallback,
  yyyymmddInInclusiveRange,
} from './admin-fill-coverage'
import type { RithmicProtocolFill } from './types'

export class AdminFillFetchError extends Error {
  constructor(
    public readonly code:
      | 'ACCOUNT_NOT_FOUND'
      | 'FETCH_FAILED'
      | 'FILL_FETCH_TIMEOUT'
      | 'INCOMPLETE_FILL_HISTORY'
      | 'HISTORY_TRUNCATED'
      | 'FILLS_DROPPED'
      | 'FILLS_UNKNOWN_SIDE',
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
    return new AdminFillFetchError('FILL_FETCH_TIMEOUT', 'Fill history timed out')
  }
  return new AdminFillFetchError('FETCH_FAILED', 'Fill history failed')
}

function toYyyymmddNumber(d: Date): number {
  return Number(toUtcYyyymmdd(d))
}

export type AdminRebuildFillResult = {
  rawFills: RithmicProtocolFill[]
  commissionRates: Map<string, number>
  commissionStatus: 'ok' | 'empty' | 'failed'
  listedAccountIds: string[]
  historyStartYmd: string
  windowsFetched: number
  coverage: AdminFillWindowCoverage[]
  droppedRows: Array<{ reason: AdminFillDropReason }>
  replayFillCount: number
}

/**
 * Fail-closed fill history for the admin rebuild. Any window error, reject,
 * timeout, cap, dropped row, or unresolved no-data window aborts — nothing
 * is swallowed into a partial ledger the way ordinary sync does.
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
}): Promise<AdminRebuildFillResult> {
  const start = parseUtcYyyyMmDd(params.historyStartDate)
  if (!start) {
    throw new AdminFillFetchError(
      'FETCH_FAILED',
      `Invalid historyStartDate ${params.historyStartDate}`,
    )
  }
  const end = utcCalendarDayAfter(new Date())
  const windows = buildUtcFillHistoryWindows(
    start,
    end,
    SHOW_FILL_HISTORY_MAX_WINDOW_DAYS,
  )
  const client = new RithmicProtocolClient()
  const fills: RithmicProtocolFill[] = []
  const rmsRows: ProductRmsCommissionRow[] = []
  const droppedRows: Array<{ reason: AdminFillDropReason }> = []
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
    if (listedAccountIds.length === 0) {
      throw new AdminFillFetchError(
        'ACCOUNT_NOT_FOUND',
        'Broker account list was empty',
      )
    }
    if (!listedAccountIds.includes(params.accountId)) {
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

    let commissionStatus: AdminRebuildFillResult['commissionStatus'] = 'ok'
    try {
      const productRms = await client.getProductRmsInfo({
        fcmId,
        ibId,
        accountId: params.accountId,
      })
      rmsRows.push(...productRms)
      if (productRms.length === 0) commissionStatus = 'empty'
    } catch {
      commissionStatus = 'failed'
    }

    const coverage: AdminFillWindowCoverage[] = []
    let historyFillCount = 0
    let missingWindowCount = 0

    for (const window of windows) {
      const startYmd = toUtcYyyyMmDd(window.start)
      const endYmd = toUtcYyyyMmDd(window.end)
      const windowFills: RithmicProtocolFill[] = []
      const history = {
        status: 'ok' as AdminFillWindowCoverage['historyStatus'],
      }
      const observe: FillHistoryObserve = {
        onRow: ({ decoded, mapped }) => {
          const observation = observeMappedFillRow(decoded, mapped != null)
          if (!observation.accepted && observation.reason) {
            droppedRows.push({ reason: observation.reason })
          }
        },
        onComplete: (info) => {
          if (info.hitCap) history.status = 'capped'
          else if (info.noData) history.status = 'no_data'
          else if (!info.ok) history.status = 'error'
        },
      }
      try {
        const accountFills = await client.getFillHistory({
          fcmId,
          ibId,
          accountId: params.accountId,
          startDateYyyymmdd: toYyyymmddNumber(window.start),
          endDateYyyymmdd: toYyyymmddNumber(window.end),
          observe,
        })
        windowFills.push(...markFillSource(accountFills, 'history'))
        historyFillCount += accountFills.length
        if (accountFills.length === 0) missingWindowCount += 1
      } catch (error) {
        history.status = 'error'
        missingWindowCount += 1
        throw classifyFetchError(error)
      }
      if (history.status === 'capped') {
        throw new AdminFillFetchError(
          'HISTORY_TRUNCATED',
          `Fill history window ${startYmd}–${endYmd} hit the 10,000-record cap`,
        )
      }
      coverage.push({
        startYmd,
        endYmd,
        historyFillCount: windowFills.length,
        historyStatus: history.status,
        fallbackFillCount: 0,
        fallbackStatus: 'skipped',
        resolved: history.status === 'ok' && windowFills.length > 0,
        source: windowFills.length > 0 ? 'history' : 'unresolved',
      })
      fills.push(...windowFills)
    }

    const fallbackPlan = orderHistoryFallbackPlan({
      historyFillCount,
      missingWindowCount,
      alreadyFetched: false,
    })
    if (fallbackPlan) {
      try {
        const fallback = await client.getFillsViaOrderHistory({
          fcmId,
          ibId,
          accountId: params.accountId,
          startDateYyyymmdd: toUtcYyyymmdd(start),
        })
        const marked = markFillSource(fallback, fallbackPlan.source)
        fills.push(...marked)
        for (const window of coverage) {
          const assigned = marked.filter((fill) =>
            yyyymmddInInclusiveRange(
              fillDateYyyymmdd(fill),
              window.startYmd,
              window.endYmd,
            ),
          )
          window.fallbackFillCount = assigned.length
          window.fallbackStatus = 'ok'
          const resolved = windowResolvedAfterFallback(window)
          window.resolved = resolved.resolved
          window.source = resolved.source
        }
      } catch {
        for (const window of coverage) {
          if (window.historyStatus === 'ok' && window.historyFillCount > 0) {
            window.fallbackStatus = 'skipped'
            window.resolved = true
            window.source = 'history'
            continue
          }
          window.fallbackStatus = 'failed'
          window.resolved = false
          window.source = 'unresolved'
        }
      }
    } else {
      for (const window of coverage) {
        const resolved = windowResolvedAfterFallback(window)
        window.resolved = resolved.resolved
        window.source = resolved.source
      }
    }

    const unresolved = coverage.filter((window) => !window.resolved)
    if (unresolved.length > 0) {
      throw new AdminFillFetchError(
        'INCOMPLETE_FILL_HISTORY',
        `${unresolved.length} fill-history window(s) were unresolved after order-history fallback`,
      )
    }

    const droppedUnknown = droppedRows.filter((row) => row.reason === 'unknown_side')
    const droppedOther = droppedRows.filter((row) => row.reason !== 'unknown_side')
    if (droppedUnknown.length > 0) {
      throw new AdminFillFetchError(
        'FILLS_UNKNOWN_SIDE',
        `${droppedUnknown.length} fill(s) had an unknown side`,
      )
    }
    if (droppedOther.length > 0) {
      throw new AdminFillFetchError(
        'FILLS_DROPPED',
        `${droppedOther.length} fill row(s) were dropped for missing symbol, price, or size`,
      )
    }

    const lookbackDays = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1,
    )
    const replayLookback = resolveReplayLookbackDays({ syncRangeDays: lookbackDays })
    const finishSsboe = Math.floor(Date.now() / 1000) + 60
    let replayFillCount = 0
    try {
      const replayed = await client.replayExecutions({
        fcmId,
        ibId,
        accountId: params.accountId,
        startSsboe: replayWindowStartSsboe(finishSsboe, replayLookback.primary),
        finishSsboe,
      })
      replayFillCount = replayed.length
      fills.push(...markFillSource(replayed, 'replay'))
    } catch {
      try {
        const replayed = await client.replayExecutions({
          fcmId,
          ibId,
          accountId: params.accountId,
          startSsboe: replayWindowStartSsboe(finishSsboe, replayLookback.fallback),
          finishSsboe,
        })
        replayFillCount = replayed.length
        fills.push(...markFillSource(replayed, 'replay'))
      } catch (error) {
        throw new AdminFillFetchError(
          'INCOMPLETE_FILL_HISTORY',
          error instanceof Error ? error.message : 'Replay executions failed',
        )
      }
    }

    return {
      rawFills: fills,
      commissionRates: indexProductRmsCommissionRates(rmsRows),
      commissionStatus,
      listedAccountIds,
      historyStartYmd: params.historyStartDate,
      windowsFetched: windows.length,
      coverage,
      droppedRows,
      replayFillCount,
    }
  } catch (error) {
    throw classifyFetchError(error)
  } finally {
    await client.close()
  }
}
