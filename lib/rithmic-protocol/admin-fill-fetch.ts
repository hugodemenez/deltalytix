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
  utcCalendarDay,
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
  observeRawFill,
  windowResolvedAfterFallback,
  yyyymmddInInclusiveRange,
} from './admin-fill-coverage'
import type { RithmicProtocolFill } from './types'

export const ADMIN_DIAGNOSTIC_LIMIT = 20

export type AdminFetchDiagnostics = {
  fills?: Array<{ fillId?: string; fillDate?: string; symbol?: string }>
  windows?: Array<{
    startYmd: string
    endYmd: string
    historyStatus: string
    resolved: boolean
  }>
}

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
    public readonly diagnostics?: AdminFetchDiagnostics,
  ) {
    super(message)
    this.name = 'AdminFillFetchError'
  }
}

/** Same start as ordinary `fetchFillsForAccounts` (historyStartDate or lookback). */
export function resolveOrdinaryHistoryStartUtc(
  historyStartDate: string | undefined,
  now = new Date(),
): Date {
  const end = utcCalendarDay(now)
  if (historyStartDate) {
    const parsed = parseUtcYyyyMmDd(historyStartDate)
    if (parsed && parsed.getTime() <= end.getTime()) return parsed
  }
  const days = Math.max(
    1,
    Number(process.env.RITHMIC_PROTOCOL_HISTORY_LOOKBACK_DAYS ?? '30'),
  )
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return start
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

function assertDeadline(deadlineMs?: number): void {
  if (deadlineMs != null && Date.now() >= deadlineMs) {
    throw new AdminFillFetchError('FILL_FETCH_TIMEOUT', 'Admin fill fetch exceeded its deadline')
  }
}

export type AdminRebuildFillResult = {
  rawFills: RithmicProtocolFill[]
  commissionRates: Map<string, number>
  commissionStatus: 'ok' | 'empty' | 'failed'
  listedAccountIds: string[]
  listedAccounts: Array<{ accountId: string; fcmId?: string; ibId?: string }>
  fcmId?: string
  ibId?: string
  historyStartYmd: string
  ordinaryStartYmd: string
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
  ordinaryStartDate?: string
  deadlineMs?: number
}): Promise<AdminRebuildFillResult> {
  const anchorStart = parseUtcYyyyMmDd(params.historyStartDate)
  if (!anchorStart) {
    throw new AdminFillFetchError(
      'FETCH_FAILED',
      `Invalid historyStartDate ${params.historyStartDate}`,
    )
  }
  const ordinaryStart = resolveOrdinaryHistoryStartUtc(params.ordinaryStartDate)
  const start =
    ordinaryStart.getTime() < anchorStart.getTime() ? ordinaryStart : anchorStart
  const end = utcCalendarDayAfter(new Date())
  const todayYmd = toUtcYyyyMmDd(utcCalendarDay(new Date()))
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
    assertDeadline(params.deadlineMs)
    await client.connect(params.gatewayUri)
    assertDeadline(params.deadlineMs)
    const login = await client.login({
      systemName: params.systemName,
      username: params.username,
      password: params.password,
      deadlineMs: params.deadlineMs,
    })
    assertDeadline(params.deadlineMs)
    const info = await client.loginInfo({ deadlineMs: params.deadlineMs })
    const loginFcmId = params.fcmId || info.fcmId || login.fcmId
    const loginIbId = params.ibId || info.ibId || login.ibId

    let listed: Array<{ accountId: string; fcmId?: string; ibId?: string }> = []
    try {
      assertDeadline(params.deadlineMs)
      listed = await client.listAccounts({
        fcmId: loginFcmId,
        ibId: loginIbId,
        userType: info.userType,
        deadlineMs: params.deadlineMs,
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
      assertDeadline(params.deadlineMs)
      const productRms = await client.getProductRmsInfo({
        fcmId,
        ibId,
        accountId: params.accountId,
        deadlineMs: params.deadlineMs,
      })
      rmsRows.push(...productRms)
      if (productRms.length === 0) commissionStatus = 'empty'
    } catch {
      commissionStatus = 'failed'
    }

    const observeRow: FillHistoryObserve['onRow'] = ({ decoded, mapped }) => {
      const observation = observeMappedFillRow(decoded, mapped != null)
      if (!observation.accepted && observation.reason) {
        droppedRows.push({ reason: observation.reason })
      }
    }

    const coverage: AdminFillWindowCoverage[] = []
    let historyFillCount = 0
    let missingWindowCount = 0

    for (const window of windows) {
      assertDeadline(params.deadlineMs)
      const startYmd = toUtcYyyyMmDd(window.start)
      const endYmd = toUtcYyyyMmDd(window.end)
      const windowFills: RithmicProtocolFill[] = []
      const history = {
        status: 'ok' as AdminFillWindowCoverage['historyStatus'],
      }
      const observe: FillHistoryObserve = {
        onRow: observeRow,
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
          deadlineMs: params.deadlineMs,
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
        fallbackDates: [],
        resolved: false,
        source: 'unresolved',
      })
      fills.push(...windowFills)
    }

    const fallbackPlan = orderHistoryFallbackPlan({
      historyFillCount,
      missingWindowCount,
      alreadyFetched: false,
    })
    let fallbackDates: string[] = []
    if (fallbackPlan) {
      assertDeadline(params.deadlineMs)
      try {
        const fallback = await client.getFillsViaOrderHistory({
          fcmId,
          ibId,
          accountId: params.accountId,
          startDateYyyymmdd: toUtcYyyymmdd(start),
          observe: { onRow: observeRow },
          onHistoryDates: (dates) => {
            fallbackDates = dates
          },
          deadlineMs: params.deadlineMs,
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
          window.fallbackDates = fallbackDates
          const resolved = windowResolvedAfterFallback({
            ...window,
            fallbackFillDays: assigned.map((fill) => fillDateYyyymmdd(fill)),
            todayYmd,
          })
          window.resolved = resolved.resolved
          window.source = resolved.source
        }
      } catch {
        for (const window of coverage) {
          window.fallbackStatus = 'failed'
          window.fallbackDates = fallbackDates
          const resolved = windowResolvedAfterFallback({ ...window, todayYmd })
          window.resolved = resolved.resolved
          window.source = resolved.source
        }
      }
    } else {
      for (const window of coverage) {
        const resolved = windowResolvedAfterFallback({ ...window, todayYmd })
        window.resolved = resolved.resolved
        window.source = resolved.source
      }
    }

    const unresolved = coverage.filter((window) => !window.resolved)
    if (unresolved.length > 0) {
      throw new AdminFillFetchError(
        'INCOMPLETE_FILL_HISTORY',
        `${unresolved.length} fill-history window(s) were unresolved after order-history fallback`,
        {
          windows: unresolved.slice(0, ADMIN_DIAGNOSTIC_LIMIT).map((window) => ({
            startYmd: window.startYmd,
            endYmd: window.endYmd,
            historyStatus: window.historyStatus,
            resolved: window.resolved,
          })),
        },
      )
    }

    const lookbackDays = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1,
    )
    const replayLookback = resolveReplayLookbackDays({ syncRangeDays: lookbackDays })
    const finishSsboe = Math.floor(Date.now() / 1000) + 60
    let replayFillCount = 0
    const runReplay = (days: number) => {
      assertDeadline(params.deadlineMs)
      return client.replayExecutions({
        fcmId,
        ibId,
        accountId: params.accountId,
        startSsboe: replayWindowStartSsboe(finishSsboe, days),
        finishSsboe,
        observe: { onRow: observeRow },
        deadlineMs: params.deadlineMs,
      })
    }
    try {
      const replayed = await runReplay(replayLookback.primary)
      replayFillCount = replayed.length
      fills.push(...markFillSource(replayed, 'replay'))
    } catch {
      try {
        const replayed = await runReplay(replayLookback.fallback)
        replayFillCount = replayed.length
        fills.push(...markFillSource(replayed, 'replay'))
      } catch (error) {
        throw new AdminFillFetchError(
          'INCOMPLETE_FILL_HISTORY',
          error instanceof Error ? error.message : 'Replay executions failed',
        )
      }
    }

    for (const fill of fills) {
      const observation = observeRawFill(fill)
      if (!observation.accepted && observation.reason) {
        droppedRows.push({ reason: observation.reason })
      }
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
        {
          fills: fills.slice(0, ADMIN_DIAGNOSTIC_LIMIT).map((fill) => ({
            fillId: fill.fillId,
            fillDate: fill.fillDate,
            symbol: fill.symbol,
          })),
        },
      )
    }

    return {
      rawFills: fills,
      commissionRates: indexProductRmsCommissionRates(rmsRows),
      commissionStatus,
      listedAccountIds,
      listedAccounts: listed,
      fcmId,
      ibId,
      historyStartYmd: params.historyStartDate,
      ordinaryStartYmd: toUtcYyyyMmDd(ordinaryStart),
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
