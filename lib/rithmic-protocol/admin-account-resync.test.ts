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
const tradeAnalyticsDeleteMany = vi.fn()
const queryRaw = vi.fn()
const transaction = vi.fn()
const decryptConnectionToken = vi.fn()
const fetchFillsForAccounts = vi.fn()
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
}))
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
import { ProtocolSyncLockError } from './sync-lock'

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

const ACCOUNT_FILLS = [
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
  rawFills = ACCOUNT_FILLS,
  commissionRates: Map<string, number> = new Map(),
) {
  return {
    rawFills,
    fills: [],
    commissionRates,
    fillStats: {
      received: rawFills.length,
      afterDedup: rawFills.length,
      dropped: {},
      skippedAlreadySeen: 0,
    },
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
      }),
    )
    connectionFindMany.mockReset().mockResolvedValue([
      {
        id: 'conn-1',
        token: 'enc-token',
        accounts: [{ number: ACCOUNT }, { number: OTHER }],
      },
    ])
    fetchFillsForAccounts.mockReset().mockResolvedValue(
      fetchedFills([
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
      ]),
    )
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
    expect(fetchFillsForAccounts).toHaveBeenCalledTimes(1)
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
    fetchFillsForAccounts.mockResolvedValueOnce(fetchedFills([]))
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

  it('refuses an empty rebuild when covered trades would all disappear', async () => {
    fetchFillsForAccounts.mockResolvedValueOnce(
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
      dryRun: false,
    })
    expect(result.error).toBe('EMPTY_REBUILD')
    expect(result.complete).toBe(false)
    expect(tradeDeleteMany).not.toHaveBeenCalled()
  })

  it('fetch failure leaves stored data in place', async () => {
    fetchFillsForAccounts.mockRejectedValueOnce(new Error('plant down'))
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
    expect(fetchFillsForAccounts).toHaveBeenCalledTimes(1)
    const fetchArgs = fetchFillsForAccounts.mock.calls[0][0] as {
      accountIds: string[]
    }
    expect(fetchArgs.accountIds).toEqual([ACCOUNT])
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
    fetchFillsForAccounts.mockResolvedValueOnce(
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
            entryId: '1002',
            closeId: '1001',
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
    expect(fetchFillsForAccounts).not.toHaveBeenCalled()
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
    expect(fetchFillsForAccounts).not.toHaveBeenCalled()
  })
})

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
  })
})
