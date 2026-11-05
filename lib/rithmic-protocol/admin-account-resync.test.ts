import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'

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
  },
}))
vi.mock('@/lib/connection-token-crypto', () => ({
  decryptConnectionToken: (...args: unknown[]) => decryptConnectionToken(...args),
}))
vi.mock('@/lib/rithmic-protocol/client', () => ({
  fetchFillsForAccounts: (...args: unknown[]) => fetchFillsForAccounts(...args),
}))
vi.mock('@/lib/rithmic-protocol/sync-lock', () => ({
  withProtocolSyncLock: (...args: unknown[]) => withProtocolSyncLock(...args),
}))

import {
  deleteAccountProtocolTradesAndFills,
  resyncRithmicProtocolAccount,
} from './admin-account-resync'

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
}

describe('admin account resync scoping and safety', () => {
  beforeEach(() => {
    tradeFindMany.mockReset().mockResolvedValue([
      {
        id: 't1',
        pnl: 10,
        tags: [RITHMIC_PROTOCOL_TRADE_TAG],
        accountNumber: ACCOUNT,
        instrument: 'MES',
        entryDate: '2026-09-30T14:00:00.000+00:00',
        closeDate: '2026-09-30T14:05:00.000+00:00',
        entryId: '1002',
        closeId: '1001',
      },
      {
        id: 't2',
        pnl: 5,
        tags: [RITHMIC_PROTOCOL_TRADE_TAG],
        accountNumber: ACCOUNT,
        instrument: 'MES',
        entryDate: '2026-10-01T14:00:00.000+00:00',
        closeDate: '2026-10-01T14:05:00.000+00:00',
        entryId: 'x',
        closeId: 'y',
      },
    ])
    fillCount.mockReset().mockResolvedValue(4)
    fillFindMany.mockReset().mockResolvedValue([])
    tradeDeleteMany.mockReset().mockResolvedValue({ count: 2 })
    tradeCreateMany.mockReset().mockResolvedValue({ count: 2 })
    fillCreateMany.mockReset().mockResolvedValue({ count: 0 })
    fillUpdateMany.mockReset().mockResolvedValue({ count: 0 })
    fillDeleteMany.mockReset().mockResolvedValue({ count: 4 })
    connectionUpdateMany.mockReset()
    moodDeleteMany.mockReset()
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
      async (_id: string, fn: () => Promise<unknown>) => fn(),
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
    fetchFillsForAccounts.mockReset().mockResolvedValue({
      rawFills: [
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
      ],
      fills: [],
      commissionRates: new Map(),
      fillStats: { received: 2, afterDedup: 2, dropped: {}, skippedAlreadySeen: 0 },
    })
  })

  it('deletes only this user and account protocol trades/fills', async () => {
    await deleteAccountProtocolTradesAndFills(USER, ACCOUNT)
    expect(tradeDeleteMany).toHaveBeenCalledWith({
      where: {
        userId: USER,
        accountNumber: ACCOUNT,
        tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
      },
    })
    expect(fillDeleteMany).toHaveBeenCalledWith({
      where: { userId: USER, accountNumber: ACCOUNT },
    })
    expect(moodDeleteMany).not.toHaveBeenCalled()
    expect(connectionUpdateMany).not.toHaveBeenCalled()
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
    expect(result.proposed?.tradeCount).toBe(1)
    expect(result.wouldDelete).toEqual({
      tradeCount: 2,
      pnl: 15,
      fillCount: 4,
    })
    expect(fetchFillsForAccounts).toHaveBeenCalledTimes(1)
    expect(tradeDeleteMany).not.toHaveBeenCalled()
    expect(fillDeleteMany).not.toHaveBeenCalled()
    expect(tradeCreateMany).not.toHaveBeenCalled()
    expect(moodDeleteMany).not.toHaveBeenCalled()
    expect(connectionUpdateMany).not.toHaveBeenCalled()
    expect(updateTag).not.toHaveBeenCalled()
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

  it('empty upstream history is not a successful rebuild', async () => {
    fillFindMany.mockResolvedValue([
      { accountNumber: ACCOUNT, symbol: 'MESZ6' },
    ])
    fetchFillsForAccounts.mockResolvedValueOnce({
      rawFills: [],
      fills: [],
      commissionRates: new Map(),
      fillStats: { received: 0, afterDedup: 0, dropped: {}, skippedAlreadySeen: 0 },
    })
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

  it('apply merges fills and replaces only this account protocol trades', async () => {
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
      actor: 'cron',
    })
    expect(result.error).toBeUndefined()
    expect(result.complete).toBe(true)
    expect(result.deleted).toEqual({ trades: 2, fills: 0 })
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
    expect(moodDeleteMany).not.toHaveBeenCalled()
    expect(connectionUpdateMany).not.toHaveBeenCalled()
    expect(updateTag).toHaveBeenCalledWith(`trades-${USER}`)
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

  it('refuses a live rebuild when an annotated trade would be unmatched', async () => {
    tradeFindMany.mockImplementation(async (args: { select?: { comment?: boolean } }) => {
      if (args?.select?.comment) {
        return [
          {
            id: 'note-1',
            accountNumber: ACCOUNT,
            instrument: 'MES',
            entryDate: '2026-01-01T00:00:00.000+00:00',
            closeDate: '2026-01-02T00:00:00.000+00:00',
            entryId: 'old-entry',
            closeId: 'old-close',
            comment: 'keep',
            tags: [RITHMIC_PROTOCOL_TRADE_TAG],
          },
        ]
      }
      return [{ pnl: 10 }, { pnl: 5 }]
    })
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: false,
    })
    expect(result.error).toBe('UNMATCHED_ANNOTATIONS')
    expect(result.proposed?.unmatchedAnnotations).toBe(1)
    expect(tradeDeleteMany).not.toHaveBeenCalled()
    expect(fillDeleteMany).not.toHaveBeenCalled()
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
