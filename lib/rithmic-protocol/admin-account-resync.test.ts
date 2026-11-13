import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
import { formatTimestamp } from '@/lib/date-utils'

const tradeFindMany = vi.fn()
const tradeDeleteMany = vi.fn()
const tradeCreateMany = vi.fn()
const fillCount = vi.fn()
const fillFindMany = vi.fn()
const fillCreateMany = vi.fn()
const fillUpdateMany = vi.fn()
const fillDeleteMany = vi.fn()
const connectionFindMany = vi.fn()
const connectionUpdateMany = vi.fn()
const moodDeleteMany = vi.fn()
const tickFindMany = vi.fn()
const accountFindMany = vi.fn()
const accountFindFirst = vi.fn()
const connectionFindFirst = vi.fn()
const tradeAnalyticsDeleteMany = vi.fn()
const queryRaw = vi.fn()
const transaction = vi.fn()
const decryptConnectionToken = vi.fn()
const fetchFillsForAccounts = vi.fn()
const fetchAdminRebuildFills = vi.fn()
const fetchInstrumentPositions = vi.fn()
const connectAndListAccounts = vi.fn()
const withProtocolSyncLock = vi.fn()
const updateTag = vi.fn()
const revalidateTag = vi.fn()

vi.mock('next/cache', () => ({
  updateTag: (...args: unknown[]) => updateTag(...args),
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    trade: {
      findMany: (...args: unknown[]) => tradeFindMany(...args),
      deleteMany: (...args: unknown[]) => tradeDeleteMany(...args),
      createMany: (...args: unknown[]) => tradeCreateMany(...args),
    },
    rithmicProtocolFill: {
      count: (...args: unknown[]) => fillCount(...args),
      findMany: (...args: unknown[]) => fillFindMany(...args),
      createMany: (...args: unknown[]) => fillCreateMany(...args),
      updateMany: (...args: unknown[]) => fillUpdateMany(...args),
      deleteMany: (...args: unknown[]) => fillDeleteMany(...args),
    },
    connection: {
      findMany: (...args: unknown[]) => connectionFindMany(...args),
      findFirst: (...args: unknown[]) => connectionFindFirst(...args),
      updateMany: (...args: unknown[]) => connectionUpdateMany(...args),
    },
    mood: {
      deleteMany: (...args: unknown[]) => moodDeleteMany(...args),
    },
    tickDetails: {
      findMany: (...args: unknown[]) => tickFindMany(...args),
    },
    account: {
      findMany: (...args: unknown[]) => accountFindMany(...args),
      findFirst: (...args: unknown[]) => accountFindFirst(...args),
    },
    tradeAnalytics: {
      deleteMany: (...args: unknown[]) => tradeAnalyticsDeleteMany(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
  },
}))
vi.mock('@/lib/connection-token-crypto', () => ({
  decryptConnectionToken: (...args: unknown[]) => decryptConnectionToken(...args),
}))
vi.mock('@/lib/rithmic-protocol/client', () => ({
  fetchFillsForAccounts: (...args: unknown[]) => fetchFillsForAccounts(...args),
  fetchInstrumentPositions: (...args: unknown[]) =>
    fetchInstrumentPositions(...args),
  connectAndListAccounts: (...args: unknown[]) => connectAndListAccounts(...args),
}))
vi.mock('@/lib/rithmic-protocol/admin-fill-fetch', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./admin-fill-fetch')>()
  return {
    ...actual,
    fetchAdminRebuildFills: (...args: unknown[]) => fetchAdminRebuildFills(...args),
  }
})
vi.mock('@/lib/rithmic-protocol/sync-lock', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./sync-lock')>()
  return {
    ...actual,
    withProtocolSyncLock: (...args: unknown[]) => withProtocolSyncLock(...args),
  }
})

import {
  planProtocolTradeSwap,
  resyncRithmicProtocolAccount,
} from './admin-account-resync'
import { AdminFillFetchError } from './admin-fill-fetch'
import { ProtocolSyncLockError } from './sync-lock'
import type { RithmicProtocolFill } from './types'

const USER = 'user-1'
const ACCOUNT = 'LFE050-I7X0S9B3-TEST001'
const OTHER = 'LFE050-OTHER'
const prismaMock = {
  trade: {
    findMany: (...args: unknown[]) => tradeFindMany(...args),
    deleteMany: (...args: unknown[]) => tradeDeleteMany(...args),
    createMany: (...args: unknown[]) => tradeCreateMany(...args),
  },
  rithmicProtocolFill: {
    count: (...args: unknown[]) => fillCount(...args),
    findMany: (...args: unknown[]) => fillFindMany(...args),
    createMany: (...args: unknown[]) => fillCreateMany(...args),
    updateMany: (...args: unknown[]) => fillUpdateMany(...args),
    deleteMany: (...args: unknown[]) => fillDeleteMany(...args),
  },
  account: {
    findMany: (...args: unknown[]) => accountFindMany(...args),
    findFirst: (...args: unknown[]) => accountFindFirst(...args),
  },
  connection: {
    findFirst: (...args: unknown[]) => connectionFindFirst(...args),
  },
  tradeAnalytics: {
    deleteMany: (...args: unknown[]) => tradeAnalyticsDeleteMany(...args),
  },
  $queryRaw: (...args: unknown[]) => queryRaw(...args),
}

const COVERED_TRADE = {
  id: 't1',
  pnl: 10,
  tags: [RITHMIC_PROTOCOL_TRADE_TAG],
  accountNumber: ACCOUNT,
  instrument: 'MES',
  side: 'Long',
  quantity: 1,
  entryPrice: 7800,
  closePrice: 7801,
  entryDate: '2026-09-30T14:00:00.000+00:00',
  closeDate: '2026-09-30T14:05:00.000+00:00',
  entryId: '1001',
  closeId: '1002',
}

const UNCOVERED_TRADE = {
  id: 't2',
  pnl: 5,
  tags: [RITHMIC_PROTOCOL_TRADE_TAG],
  accountNumber: ACCOUNT,
  instrument: 'MES',
  entryDate: '2026-08-01T14:00:00.000+00:00',
  closeDate: '2026-08-01T14:05:00.000+00:00',
  entryId: 'x',
  closeId: 'y',
}

const ACCOUNT_FILLS: RithmicProtocolFill[] = [
  {
    accountId: ACCOUNT,
    symbol: 'MESZ6',
    transactionType: 'BUY',
    fillPrice: 7800,
    fillSize: 1,
    fillId: '1001',
    fillDate: '20260930',
    ssboe: Date.parse('2026-09-30T14:00:00Z') / 1000,
    source: 'history',
  },
  {
    accountId: ACCOUNT,
    symbol: 'MESZ6',
    transactionType: 'SELL',
    fillPrice: 7801,
    fillSize: 1,
    fillId: '1002',
    fillDate: '20260930',
    ssboe: Date.parse('2026-09-30T14:05:00Z') / 1000,
    source: 'history',
  },
]

function fetchedFills(
  rawFills: RithmicProtocolFill[] = ACCOUNT_FILLS,
  commissionRates?: Map<string, number>,
  historyStartYmd = '2026-09-01',
) {
  const rates = commissionRates ?? new Map([[`${ACCOUNT}|MES`, 1]])
  return {
    rawFills,
    fills: [],
    commissionRates: rates,
    commissionStatus: 'ok' as const,
    listedAccountIds: [ACCOUNT],
    listedAccounts: [{ accountId: ACCOUNT, fcmId: 'fcm', ibId: 'ib' }],
    fcmId: 'fcm',
    ibId: 'ib',
    historyStartYmd,
    ordinaryStartYmd: '2026-09-01',
    fetchStartYmd: historyStartYmd,
    orderHistoryDates: [] as string[],
    windowsFetched: 1,
    coverage: [
      {
        startYmd: historyStartYmd,
        endYmd: '2026-11-08',
        historyFillCount: rawFills.length,
        historyStatus: 'ok' as const,
        fallbackFillCount: 0,
        fallbackStatus: 'skipped' as const,
        fallbackDates: [] as string[],
        resolved: true,
        source: 'history' as const,
      },
    ],
    droppedRows: [],
    replayFillCount: 0,
    fillStats: {
      received: rawFills.length,
      afterDedup: rawFills.length,
      dropped: {},
      skippedAlreadySeen: 0,
    },
  }
}

function flatSnapshot(accountId = ACCOUNT) {
  return {
    positions: [] as Array<{ accountId: string; symbol: string; netQuantity: number }>,
    complete: true,
    capturedAtMs: Date.now(),
    capturedUntilMs: Date.now(),
    noDataAccountIds: [],
    incompleteAccountIds: [],
    rejectedAccountIds: [],
    missingAccountIds: [],
    evidenceAccountIds: [accountId],
    requestedAccountIds: [accountId],
  }
}

describe('planProtocolTradeSwap', () => {
  it('retains uncovered rows and does not wipe analytics for rebuilt ids', () => {
    const plan = planProtocolTradeSwap({
      existing: [
        { ...COVERED_TRADE, id: 'kept-row' },
        UNCOVERED_TRADE,
      ],
      rebuiltIds: ['kept-row'],
      uncoveredIds: ['t2'],
      unmatchedIds: [],
      allowUnmatchedAnnotations: false,
    })
    expect(plan.toDelete).toEqual(['kept-row'])
    expect(plan.analyticsDelete).toEqual([])
    expect(plan.keepIds).toEqual(['t2'])
  })

  it('never puts retained pre-anchor ids on the delete list', () => {
    const plan = planProtocolTradeSwap({
      existing: [COVERED_TRADE, UNCOVERED_TRADE],
      rebuiltIds: ['t1'],
      uncoveredIds: [],
      unmatchedIds: [],
      allowUnmatchedAnnotations: false,
      retainIds: ['t2'],
    })
    expect(plan.toDelete).toEqual(['t1'])
    expect(plan.keepIds).toEqual(['t2'])
  })
})

describe('admin account resync scoping and safety', () => {
  beforeEach(() => {
    tradeFindMany.mockReset().mockResolvedValue([COVERED_TRADE])
    fillCount.mockReset().mockResolvedValue(2)
    fillFindMany.mockReset().mockResolvedValue([])
    tradeDeleteMany.mockReset().mockResolvedValue({ count: 1 })
    tradeCreateMany.mockReset().mockResolvedValue({ count: 1 })
    fillCreateMany.mockReset().mockResolvedValue({ count: 2 })
    fillUpdateMany.mockReset().mockResolvedValue({ count: 0 })
    fillDeleteMany.mockReset().mockResolvedValue({ count: 0 })
    connectionUpdateMany.mockReset()
    moodDeleteMany.mockReset()
    queryRaw.mockReset().mockResolvedValue([])
    tickFindMany.mockReset().mockResolvedValue([
      { ticker: 'MES', tickSize: 0.25, tickValue: 1.25 },
    ])
    accountFindMany.mockReset().mockResolvedValue([
      { id: 'acct-1', number: ACCOUNT },
    ])
    accountFindFirst.mockReset().mockResolvedValue({ id: 'acct-1' })
    connectionFindFirst.mockReset().mockResolvedValue({ id: 'conn-1' })
    tradeAnalyticsDeleteMany.mockReset().mockResolvedValue({ count: 0 })
    updateTag.mockReset()
    revalidateTag.mockReset()
    transaction.mockReset().mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return arg(prismaMock)
      }
      return Promise.all(arg as Promise<unknown>[])
    })
    withProtocolSyncLock.mockReset().mockImplementation(
      async (
        _keys: unknown,
        fn: (guard: { throwIfLost: () => void }) => Promise<unknown>,
      ) => fn({ throwIfLost: () => {} }),
    )
    decryptConnectionToken.mockReset().mockReturnValue(
      JSON.stringify({
        username: 'trader',
        password: 'secret',
        systemName: 'Rithmic',
        gatewayUri: 'wss://rprotocol.rithmic.com:443',
        accountIds: [ACCOUNT, OTHER],
        historyStartDate: '2026-09-01',
      }),
    )
    connectAndListAccounts.mockReset().mockResolvedValue({
      accounts: [{ accountId: ACCOUNT, fcmId: 'fcm', ibId: 'ib' }],
      fcmId: 'fcm',
      ibId: 'ib',
    })
    connectionFindMany.mockReset().mockResolvedValue([
      {
        id: 'conn-1',
        token: 'enc-token',
        accounts: [{ number: ACCOUNT }, { number: OTHER }],
      },
    ])
    fetchFillsForAccounts.mockReset()
    fetchAdminRebuildFills.mockReset().mockImplementation(
      async (args: { historyStartDate?: string; ordinaryStartDate?: string }) =>
        fetchedFills(
          [
            ...ACCOUNT_FILLS,
            {
              accountId: OTHER,
              symbol: 'MESZ6',
              transactionType: 'BUY',
              fillPrice: 1,
              fillSize: 1,
              fillId: 'foreign',
              fillDate: '20260930',
              ssboe: Date.parse('2026-09-30T14:00:00Z') / 1000,
              source: 'history',
            },
          ],
          undefined,
          args.ordinaryStartDate && args.historyStartDate
            ? [args.ordinaryStartDate, args.historyStartDate].sort()[0]
            : args.historyStartDate ?? '2026-09-01',
        ),
    )
    fetchInstrumentPositions.mockReset().mockResolvedValue(flatSnapshot())
  })

  it('locks by userId+accountNumber even without connectionId', async () => {
    await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
    })
    expect(withProtocolSyncLock).toHaveBeenCalledWith(
      [`${USER}:${ACCOUNT}`],
      expect.any(Function),
    )
  })

  it('passes an absolute snapshot deadline so a normal dry run gets past the snapshot', async () => {
    const before = Date.now()
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
    })
    expect(result.error).toBeUndefined()
    expect(result.complete).toBe(true)
    expect(result.error).not.toBe('FILL_FETCH_TIMEOUT')
    expect(result.error).not.toBe('POSITION_SNAPSHOT_UNAVAILABLE')
    expect(fetchInstrumentPositions).toHaveBeenCalled()
    const snapshotDeadline = (
      fetchInstrumentPositions.mock.calls[0][0] as { deadlineMs: number }
    ).deadlineMs
    expect(snapshotDeadline).toBeGreaterThan(1_000_000_000_000)
    expect(snapshotDeadline).toBeGreaterThan(before)
  })

  it('scopes broker snapshots to the target account when the login lists several', async () => {
    connectAndListAccounts.mockResolvedValueOnce({
      accounts: [
        { accountId: ACCOUNT, fcmId: 'fcm', ibId: 'ib' },
        { accountId: OTHER, fcmId: 'fcm', ibId: 'ib' },
      ],
      fcmId: 'fcm',
      ibId: 'ib',
    })
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
    })
    expect(result.error).toBeUndefined()
    expect(result.complete).toBe(true)
    expect(fetchInstrumentPositions).toHaveBeenCalled()
    for (const [request] of fetchInstrumentPositions.mock.calls) {
      expect((request as { accountIds: string[] }).accountIds).toEqual([ACCOUNT])
    }
  })

  it('dryRun fetches a proposed rebuild and does not write', async () => {
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
      actor: 'admin-1',
    })
    expect(result.complete).toBe(true)
    expect(result.dryRun).toBe(true)
    expect(result.error).toBeUndefined()
    expect(result.proposed?.fillCount).toBe(2)
    expect(result.proposed?.ledgerRowsAfterMerge).toBe(2)
    expect(result.proposed?.tradeCount).toBe(1)
    expect(result.proposed?.uncoveredTrades).toEqual([])
    expect(result.wouldDelete).toEqual({
      tradeCount: 1,
      pnl: 10,
      fillCount: 0,
    })
    expect(fetchAdminRebuildFills).toHaveBeenCalledTimes(1)
    expect(fetchAdminRebuildFills).toHaveBeenCalledWith(
      expect.objectContaining({ ordinaryStartDate: '2026-09-01' }),
    )
    expect(connectAndListAccounts).toHaveBeenCalled()
    expect(fetchFillsForAccounts).not.toHaveBeenCalled()
    expect(tradeDeleteMany).not.toHaveBeenCalled()
    expect(fillDeleteMany).not.toHaveBeenCalled()
    expect(tradeCreateMany).not.toHaveBeenCalled()
    expect(moodDeleteMany).not.toHaveBeenCalled()
    expect(connectionUpdateMany).not.toHaveBeenCalled()
    expect(updateTag).not.toHaveBeenCalled()
  })

  it('dryRun proposed counts match the live write plan', async () => {
    const preview = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
    })
    const live = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
    })
    expect(live.error).toBeUndefined()
    expect(live.proposed).toEqual(preview.proposed)
    expect(live.wouldDelete).toEqual(preview.wouldDelete)
  })

  it('refuses live apply when stored trades have legs outside the fill ledger', async () => {
    tradeFindMany.mockResolvedValue([COVERED_TRADE, UNCOVERED_TRADE])
    fillCount.mockResolvedValue(2)
    const preview = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
    })
    expect(preview.complete).toBe(true)
    expect(preview.wouldRefuse).toBe(true)
    expect(preview.wouldRefuseReasons).toContain('UNCOVERED_TRADES')
    expect(preview.proposed?.uncoveredTrades.map((row) => row.id)).toEqual(['t2'])
    expect(preview.warnings?.some((warning) => warning.includes('UNCOVERED_TRADES'))).toBe(
      true,
    )
    expect(preview.warnings?.some((warning) => warning.includes('later than stored'))).toBe(
      true,
    )
    const live = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
    })
    expect(live.error).toBe('UNCOVERED_TRADES')
    expect(live.complete).toBe(false)
    expect(live.proposed).toEqual(preview.proposed)
    expect(tradeDeleteMany).not.toHaveBeenCalled()
    expect(tradeCreateMany).not.toHaveBeenCalled()
    expect(updateTag).not.toHaveBeenCalled()
  })

  it('empty upstream history refuses even when the fill table is already empty', async () => {
    fillFindMany.mockResolvedValue([])
    fillCount.mockResolvedValue(0)
    fetchAdminRebuildFills.mockResolvedValueOnce(fetchedFills([]))
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
    })
    expect(result.error).toBe('EMPTY_UPSTREAM_HISTORY')
    expect(result.complete).toBe(false)
    expect(tradeDeleteMany).not.toHaveBeenCalled()
    expect(fillDeleteMany).not.toHaveBeenCalled()
  })

  it('refuses when stored closed trades are not covered by upstream fill quantity (W3)', async () => {
    fetchInstrumentPositions.mockResolvedValue({
      ...flatSnapshot(),
      positions: [{ accountId: ACCOUNT, symbol: 'MESZ6', netQuantity: 2 }],
    })
    fetchAdminRebuildFills.mockResolvedValueOnce(
      fetchedFills([
        ACCOUNT_FILLS[0],
        {
          ...ACCOUNT_FILLS[1],
          transactionType: 'BUY',
          fillId: '1002',
        },
      ]),
    )
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
    })
    expect(result.wouldRefuse).toBe(true)
    expect(result.wouldRefuseReasons).toContain('UNCOVERED_TRADES')
    expect(tradeDeleteMany).not.toHaveBeenCalled()
  })

  it('maps connectAndListAccounts errors to FETCH_FAILED, not ACCOUNT_NOT_FOUND', async () => {
    connectAndListAccounts.mockRejectedValueOnce(new Error('websocket down'))
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
    })
    expect(result.error).toBe('FETCH_FAILED')
    expect(fetchAdminRebuildFills).not.toHaveBeenCalled()
  })

  it('fetch failure leaves stored data in place', async () => {
    fetchAdminRebuildFills.mockRejectedValueOnce(new Error('plant down'))
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
      actor: 'cron',
    })
    expect(result.error).toBe('FETCH_FAILED')
    expect(result.complete).toBe(false)
    expect(tradeDeleteMany).not.toHaveBeenCalled()
    expect(fillDeleteMany).not.toHaveBeenCalled()
    expect(tradeCreateMany).not.toHaveBeenCalled()
    expect(updateTag).not.toHaveBeenCalled()
  })

  it('apply merges fills and replaces only this account protocol trades', async () => {
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
      actor: 'cron',
    })
    expect(result.error).toBeUndefined()
    expect(result.complete).toBe(true)
    expect(result.committed).toBe(true)
    expect(result.deleted).toEqual({ trades: 1, fills: 0 })
    expect(result.after?.savedCount).toBe(1)
    expect(fillDeleteMany).not.toHaveBeenCalled()
    expect(fetchAdminRebuildFills).toHaveBeenCalledTimes(1)
    expect(fetchFillsForAccounts).not.toHaveBeenCalled()
    const fetchArgs = fetchAdminRebuildFills.mock.calls[0][0] as {
      accountId: string
    }
    expect(fetchArgs.accountId).toBe(ACCOUNT)
    expect(tradeDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: USER,
          accountNumber: ACCOUNT,
          tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
        }),
      }),
    )
    const insertedFills = fillCreateMany.mock.calls[0][0].data as Array<{
      accountNumber: string
    }>
    expect(insertedFills.every((row) => row.accountNumber === ACCOUNT)).toBe(true)
    expect(moodDeleteMany).not.toHaveBeenCalled()
    expect(connectionUpdateMany).not.toHaveBeenCalled()
    expect(updateTag).toHaveBeenCalledWith(`trades-${USER}`)
  })

  it('passes plant commission rates into FIFO like ordinary sync', async () => {
    fetchAdminRebuildFills.mockResolvedValueOnce(
      fetchedFills(ACCOUNT_FILLS, new Map([[`${ACCOUNT}|MES`, 1.2]])),
    )
    await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
    })
    const rows = tradeCreateMany.mock.calls[0][0].data as Array<{
      commission: number
    }>
    expect(rows[0]?.commission).toBe(2.4)
  })

  it('fails when skipDuplicates drops rebuilt rows', async () => {
    tradeCreateMany.mockResolvedValue({ count: 0 })
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
    })
    expect(result.error).toBe('INSERT_MISMATCH')
    expect(result.complete).toBe(false)
    expect(result.committed).toBeUndefined()
    expect(updateTag).not.toHaveBeenCalled()
  })

  it('does not claim stored data was left unchanged after a post-commit read failure', async () => {
    let fillReads = 0
    fillCount.mockImplementation(async () => {
      fillReads += 1
      if (fillReads >= 4) throw new Error('read failed')
      return 2
    })
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
    })
    expect(result.error).toBe('POST_COMMIT_WARNING')
    expect(result.complete).toBe(true)
    expect(result.committed).toBe(true)
    expect(result.deleted).toEqual({ trades: 1, fills: 0 })
    expect(JSON.stringify(result)).not.toMatch(/was not deleted/i)
  })

  it('keeps TradeAnalytics for a rebuilt trade that retains its id', async () => {
    const entryDate = formatTimestamp(
      new Date(Date.parse('2026-09-30T14:00:00Z')).toISOString(),
    )
    const closeDate = formatTimestamp(
      new Date(Date.parse('2026-09-30T14:05:00Z')).toISOString(),
    )
    tradeFindMany.mockImplementation(async (args: { select?: { comment?: boolean } }) => {
      if (args?.select?.comment) {
        return [
          {
            ...COVERED_TRADE,
            id: 'kept-row',
            entryDate,
            closeDate,
            comment: 'keep',
          },
        ]
      }
      return [{ pnl: 10 }]
    })
    tradeCreateMany.mockResolvedValue({ count: 1 })
    await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
    })
    const created = tradeCreateMany.mock.calls[0][0].data as Array<{ id: string }>
    expect(created[0]?.id).toBe('kept-row')
    expect(tradeAnalyticsDeleteMany).not.toHaveBeenCalled()
  })

  it('apply failure rolls back and does not invalidate caches', async () => {
    transaction.mockImplementationOnce(async () => {
      throw new Error('write failed')
    })
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
    })
    expect(result.error).toBe('APPLY_FAILED')
    expect(result.complete).toBe(false)
    expect(updateTag).not.toHaveBeenCalled()
  })

  it('aborts with CONCURRENT_SYNC when a journal field changes under the lock', async () => {
    let annotatedLoads = 0
    tradeFindMany.mockImplementation(async (args: { select?: { comment?: boolean } }) => {
      if (args?.select?.comment) {
        annotatedLoads += 1
        if (annotatedLoads === 1) return [COVERED_TRADE]
        return [{ ...COVERED_TRADE, comment: 'added while fetching' }]
      }
      return [{ pnl: 10 }]
    })
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
    })
    expect(result.error).toBe('CONCURRENT_SYNC')
    expect(result.complete).toBe(false)
    expect(tradeCreateMany).not.toHaveBeenCalled()
  })

  it('ignores allowUnmatchedAnnotations and would-refuse unmatched rows', async () => {
    tradeFindMany.mockImplementation(async (args: { select?: { comment?: boolean } }) => {
      if (args?.select?.comment) {
        return [
          {
            ...COVERED_TRADE,
            id: 'note-1',
            entryDate: '2026-09-30T10:00:00.000+00:00',
            closeDate: '2026-09-30T10:05:00.000+00:00',
            comment: 'keep',
          },
        ]
      }
      return [{ pnl: 10 }]
    })
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
      allowUnmatchedAnnotations: true,
    })
    expect(result.wouldRefuse).toBe(true)
    expect(result.wouldRefuseReasons).toContain('UNMATCHED_ANNOTATIONS')
    expect(result.warnings?.some((warning) => warning.includes('ignored'))).toBe(
      true,
    )
  })

  it('aborts with CONCURRENT_SYNC when the locked rows moved', async () => {
    let fillReads = 0
    fillCount.mockImplementation(async () => {
      fillReads += 1
      if (fillReads === 3) return 99
      return 2
    })
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
    })
    expect(result.error).toBe('CONCURRENT_SYNC')
    expect(result.complete).toBe(false)
    expect(tradeCreateMany).not.toHaveBeenCalled()
  })

  it('refuses a live rebuild when an annotated trade would be unmatched', async () => {
    tradeFindMany.mockImplementation(async (args: { select?: { comment?: boolean } }) => {
      if (args?.select?.comment) {
        return [
          {
            ...COVERED_TRADE,
            id: 'note-1',
            entryDate: '2026-09-30T10:00:00.000+00:00',
            closeDate: '2026-09-30T10:05:00.000+00:00',
            comment: 'keep',
          },
        ]
      }
      return [{ pnl: 10 }]
    })
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
    })
    expect(result.error).toBe('UNMATCHED_ANNOTATIONS')
    expect(result.proposed?.unmatchedAnnotations).toBe(1)
    expect(result.proposed?.unmatchedAnnotatedTrades[0]?.id).toBe('note-1')
    expect(tradeDeleteMany).not.toHaveBeenCalled()
    expect(fillDeleteMany).not.toHaveBeenCalled()
  })

  it('maps a lock timeout without writing', async () => {
    withProtocolSyncLock.mockRejectedValueOnce(
      new ProtocolSyncLockError('LOCK_TIMEOUT', 'timed out'),
    )
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
    })
    expect(result.error).toBe('LOCK_TIMEOUT')
    expect(result.complete).toBe(false)
    expect(tradeDeleteMany).not.toHaveBeenCalled()
  })

  it('does not sync when the account is not on the stored connection', async () => {
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: 'NOT-THIS-ACCOUNT',
      dryRun: false,
    })
    expect(result.error).toBe('ACCOUNT_NOT_ON_CONNECTION')
    expect(tradeDeleteMany).not.toHaveBeenCalled()
    expect(fetchAdminRebuildFills).not.toHaveBeenCalled()
    expect(fetchInstrumentPositions).not.toHaveBeenCalled()
  })

  it('returns AMBIGUOUS_CONNECTION when two connections hold the account', async () => {
    connectionFindMany.mockResolvedValue([
      {
        id: 'conn-1',
        token: 'enc-token',
        accounts: [{ number: ACCOUNT }],
      },
      {
        id: 'conn-2',
        token: 'enc-token-2',
        accounts: [{ number: ACCOUNT }],
      },
    ])
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
    })
    expect(result.error).toBe('AMBIGUOUS_CONNECTION')
    expect(result.connectionIds).toEqual(['conn-1', 'conn-2'])
    expect(fetchAdminRebuildFills).not.toHaveBeenCalled()
  })

  it('never deletes a trade that closed before the weekend anchor', async () => {
    const preAnchor = {
      ...UNCOVERED_TRADE,
      id: 'pre-anchor',
      entryDate: '2026-06-01T14:00:00.000+00:00',
      closeDate: '2026-06-01T14:05:00.000+00:00',
    }
    tradeFindMany.mockImplementation(async (args: { select?: { comment?: boolean } }) => {
      if (args?.select?.comment) return [COVERED_TRADE, preAnchor]
      return [{ pnl: 10 }, { pnl: 5 }]
    })
    await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
      anchorDate: '2026-09-25',
    })
    expect(tradeDeleteMany).toHaveBeenCalled()
    const deletedIds = tradeDeleteMany.mock.calls[0][0].where.id.in as string[]
    expect(deletedIds).toEqual(['t1'])
    expect(deletedIds).not.toContain('pre-anchor')
  })

  it('refuses when the broker rejects the account snapshot (Q2/Q5)', async () => {
    fetchInstrumentPositions.mockResolvedValue({
      ...flatSnapshot(),
      complete: false,
      reason: 'rejected',
      rejectedAccountIds: [ACCOUNT],
      evidenceAccountIds: [],
    })
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
    })
    expect(result.error).toBe('ACCOUNT_REJECTED')
    expect(result.complete).toBe(false)
    expect(tradeDeleteMany).not.toHaveBeenCalled()
  })

  it('refuses when before and after snapshots disagree', async () => {
    fetchInstrumentPositions
      .mockResolvedValueOnce({
        ...flatSnapshot(),
        positions: [{ accountId: ACCOUNT, symbol: 'MESZ6', netQuantity: 2 }],
      })
      .mockResolvedValueOnce({
        ...flatSnapshot(),
        positions: [{ accountId: ACCOUNT, symbol: 'MESZ6', netQuantity: 0 }],
      })
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
    })
    expect(result.error).toBe('POSITION_SNAPSHOT_MOVED')
    expect(tradeDeleteMany).not.toHaveBeenCalled()
  })

  it('refuses an incomplete snapshot instead of inferring flat', async () => {
    fetchInstrumentPositions.mockResolvedValue({
      ...flatSnapshot(),
      complete: false,
      reason: 'timeout',
      incompleteAccountIds: [ACCOUNT],
    })
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
    })
    expect(result.error).toBe('POSITION_SNAPSHOT_UNAVAILABLE')
  })

  it('refuses fills that lack ssboe (Q11)', async () => {
    fetchAdminRebuildFills.mockResolvedValueOnce(
      fetchedFills([
        (() => {
          const { ssboe: _ssboe, ...rest } = ACCOUNT_FILLS[0]
          return { ...rest, fillTime: '14:00:00' } as RithmicProtocolFill
        })(),
        ACCOUNT_FILLS[1],
      ]),
    )
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
    })
    expect(result.error).toBe('FILLS_MISSING_SSBOE')
    expect(tradeDeleteMany).not.toHaveBeenCalled()
  })

  it("refuses Jérémie's 328-buy / 330-sell book at an anchor where P_0 is +2", async () => {
    const fills = jeremieAdminFills(false)
    fetchAdminRebuildFills.mockResolvedValue(fetchedFills(fills))
    const preview = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
    })
    const live = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
    })
    expect(preview.error).toBe('OPENING_NOT_FLAT')
    expect(live.error).toBe('OPENING_NOT_FLAT')
    expect(preview.proposed?.positionChecks).toEqual(live.proposed?.positionChecks)
    expect(preview.wouldDelete).toEqual(live.wouldDelete)
    expect(preview.proposed?.positionChecks?.[0]).toMatchObject({
      symbol: 'MESZ6',
      pEnd: 0,
      net: -2,
      p0: 2,
      buyLots: 328,
      sellLots: 330,
    })
    expect(preview.proposed?.openingNotFlatReport).toContain('P_0=+2')
    expect(tradeDeleteMany).not.toHaveBeenCalled()
  })

  it('does not swallow a partial fill-history failure (Q6)', async () => {
    fetchAdminRebuildFills.mockRejectedValueOnce(
      new AdminFillFetchError('INCOMPLETE_FILL_HISTORY', 'replay failed'),
    )
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
    })
    expect(result.error).toBe('INCOMPLETE_FILL_HISTORY')
    expect(tradeDeleteMany).not.toHaveBeenCalled()
  })

  it('refuses a no-data snapshot instead of inferring flat (H3)', async () => {
    fetchInstrumentPositions.mockResolvedValue({
      ...flatSnapshot(),
      complete: false,
      reason: 'no_data',
      noDataAccountIds: [ACCOUNT],
      evidenceAccountIds: [ACCOUNT],
    })
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
    })
    expect(result.error).toBe('POSITION_SNAPSHOT_UNAVAILABLE')
    expect(fetchAdminRebuildFills).not.toHaveBeenCalled()
  })

  it('refuses timestamp-0 fills before the window filter (M2)', async () => {
    fetchAdminRebuildFills.mockResolvedValueOnce(
      fetchedFills([
        {
          accountId: ACCOUNT,
          symbol: 'MESZ6',
          transactionType: 'BUY',
          fillPrice: 7800,
          fillSize: 1,
          fillId: 'ghost',
          source: 'history',
        } as RithmicProtocolFill,
        ACCOUNT_FILLS[1],
      ]),
    )
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
    })
    expect(result.error).toBe('FILLS_MISSING_TIMESTAMP')
  })

  it('refuses when an ordinary-range prefix would change FIFO vs the rebuild (F2+W1)', async () => {
    const fridayPrefix: RithmicProtocolFill = {
      accountId: ACCOUNT,
      symbol: 'MESZ6',
      transactionType: 'SELL',
      fillPrice: 5810,
      fillSize: 1,
      fillId: 'friday-short',
      fillDate: '20260925',
      ssboe: Date.parse('2026-09-25T15:00:00Z') / 1000,
      source: 'history',
    }
    fetchAdminRebuildFills.mockImplementation(
      async (args: { historyStartDate?: string; ordinaryStartDate?: string }) =>
        fetchedFills(
          [fridayPrefix, ...ACCOUNT_FILLS],
          undefined,
          args.ordinaryStartDate && args.historyStartDate
            ? [args.ordinaryStartDate, args.historyStartDate].sort()[0]
            : args.historyStartDate ?? '2026-09-01',
        ),
    )
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
      anchorDate: '2026-09-25',
    })
    expect(result.error).toBe('ORDINARY_SYNC_DIVERGENCE')
    expect(result.diagnostics?.fills?.some((row) => row.fillId === 'friday-short')).toBe(
      true,
    )
    expect(result.committed).toBeUndefined()
    expect(tradeCreateMany).not.toHaveBeenCalled()
  })

  it('does not refuse a prefix outside ordinary fetch range (F2)', async () => {
    const tooOld: RithmicProtocolFill = {
      accountId: ACCOUNT,
      symbol: 'MESZ6',
      transactionType: 'SELL',
      fillPrice: 5810,
      fillSize: 1,
      fillId: 'august-short',
      fillDate: '20260801',
      ssboe: Date.parse('2026-08-01T15:00:00Z') / 1000,
      source: 'history',
    }
    fetchAdminRebuildFills.mockImplementation(
      async (args: { historyStartDate?: string; ordinaryStartDate?: string }) =>
        fetchedFills(
          [tooOld, ...ACCOUNT_FILLS],
          undefined,
          args.ordinaryStartDate && args.historyStartDate
            ? [args.ordinaryStartDate, args.historyStartDate].sort()[0]
            : args.historyStartDate ?? '2026-09-01',
        ),
    )
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
      anchorDate: '2026-09-25',
    })
    expect(result.error).toBeUndefined()
    expect(result.wouldRefuse).toBeFalsy()
    expect(result.complete).toBe(true)
  })

  it('does not refuse ORDINARY_SYNC_DIVERGENCE when the anchor is before historyStartDate (F8)', async () => {
    decryptConnectionToken.mockReturnValue(
      JSON.stringify({
        username: 'trader',
        password: 'secret',
        systemName: 'Rithmic',
        gatewayUri: 'wss://rprotocol.rithmic.com:443',
        accountIds: [ACCOUNT, OTHER],
        historyStartDate: '2026-10-01',
      }),
    )
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
      anchorDate: '2026-09-25',
    })
    expect(result.error).toBeUndefined()
    expect(result.wouldRefuseReasons ?? []).not.toContain('ORDINARY_SYNC_DIVERGENCE')
    expect(result.complete).toBe(true)
  })

  it('refuses when the ordinary-eligible range before the anchor is unfetchable (W1)', async () => {
    fetchAdminRebuildFills.mockImplementation(async () =>
      fetchedFills(ACCOUNT_FILLS, undefined, '2026-09-25'),
    )
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
      anchorDate: '2026-09-25',
    })
    expect(result.error).toBe('ORDINARY_RANGE_UNFETCHABLE')
    expect(result.diagnostics?.windows?.[0]?.startYmd).toBe('2026-09-25')
  })

  it('FIFO on a flat Jérémie window produces no phantom shorts', async () => {
    tradeFindMany.mockResolvedValue([])
    fillCount.mockResolvedValue(0)
    fetchAdminRebuildFills.mockImplementation(async () =>
      fetchedFills(jeremieAdminFills(true)),
    )
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
      anchorDate: '2026-09-25',
    })
    expect(result.error).toBeUndefined()
    expect(result.wouldRefuse).toBeFalsy()
    expect(result.proposed?.openSkipped).toBe(0)
    expect(result.proposed?.positionChecks?.[0]).toMatchObject({ p0: 0, pEnd: 0, net: 0 })
    expect(result.proposed?.tradesCreated).toBeGreaterThan(0)
  })

  it('refuses dry-run when the connection is not linked to the account (L-b)', async () => {
    connectionFindFirst.mockResolvedValueOnce(null)
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
    })
    expect(result.error).toBe('CONNECTION_UNLINKED')
    expect(fetchAdminRebuildFills).not.toHaveBeenCalled()
  })

  it('refuses when Product RMS has no rate for a rebuilt product (N10)', async () => {
    fetchAdminRebuildFills.mockResolvedValueOnce(
      fetchedFills(ACCOUNT_FILLS, new Map()),
    )
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
    })
    expect(result.wouldRefuse).toBe(true)
    expect(result.wouldRefuseReasons).toContain('COMMISSION_RATES_UNAVAILABLE')
  })
})

function jeremieAdminFills(includeOpeningBuys: boolean) {
  const fills: RithmicProtocolFill[] = []
  let seq = 1
  let ssboe = Date.parse('2026-09-30T14:00:00.000Z') / 1000
  const next = () => {
    ssboe += 1
    return ssboe
  }
  const push = (side: 'BUY' | 'SELL', price: number) => {
    fills.push({
      accountId: ACCOUNT,
      symbol: 'MESZ6',
      transactionType: side,
      fillPrice: price,
      fillSize: 1,
      fillId: `${side}-${seq++}`,
      fillDate: '20260930',
      ssboe: next(),
      source: 'history',
    })
  }
  if (includeOpeningBuys) {
    push('BUY', 5800)
    push('BUY', 5800)
  }
  for (let i = 0; i < 328; i += 1) {
    push('BUY', 5800)
    push('SELL', 5801)
  }
  push('SELL', 5799)
  push('SELL', 5798)
  return fills
}

describe('Mood / journal schema vs trade delete', () => {
  it('Mood has no Trade foreign key so rebuild cannot cascade journal rows', () => {
    const schema = readFileSync('prisma/schema.prisma', 'utf8')
    const mood = schema.slice(schema.indexOf('model Mood {'), schema.indexOf('model Shared {'))
    expect(mood).toContain('userId')
    expect(mood).toContain('journalContent')
    expect(mood).not.toContain('tradeId')
    expect(mood).not.toContain('Trade')
    const trade = schema.slice(schema.indexOf('model Trade {'), schema.indexOf('model TickDetails {'))
    expect(trade).toContain('comment')
    expect(trade).toContain('imageBase64')
    expect(trade).toContain('groupId')
    expect(trade).not.toContain('onDelete: Cascade')
    expect(trade).not.toContain('TradeAnalytics')
    const analytics = schema.slice(
      schema.indexOf('model TradeAnalytics {'),
      schema.indexOf('model HistoricalData {'),
    )
    expect(analytics).toContain('tradeId')
    expect(analytics).not.toMatch(/\bTrade\b/)
    expect(analytics).not.toContain('onDelete')
    expect(analytics).not.toContain('@relation')
  })
})
