import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
import { serverActor } from '@/lib/api/server-actor'

vi.mock('server-only', () => ({}))

const tradeFindMany = vi.fn()
const tradeDeleteMany = vi.fn()
const fillFindMany = vi.fn()
const fillCreateMany = vi.fn()
const fillUpdateMany = vi.fn()
const connectionFindUnique = vi.fn()
const connectionUpdate = vi.fn()
const accountFindMany = vi.fn()
const transaction = vi.fn()
const fetchFillsForAccounts = vi.fn()
const fetchInstrumentPositions = vi.fn()
const withProtocolSyncLock = vi.fn()
const saveTradesAction = vi.fn()
const getTickDetails = vi.fn()
const upsertAccountsForNumbers = vi.fn()
const invalidateConnectionsPageCache = vi.fn()
const encryptConnectionToken = vi.fn()

vi.mock('next/cache', () => ({
  updateTag: vi.fn(),
  revalidateTag: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    trade: {
      findMany: (...args: unknown[]) => tradeFindMany(...args),
      deleteMany: (...args: unknown[]) => tradeDeleteMany(...args),
    },
    rithmicProtocolFill: {
      findMany: (...args: unknown[]) => fillFindMany(...args),
      createMany: (...args: unknown[]) => fillCreateMany(...args),
      updateMany: (...args: unknown[]) => fillUpdateMany(...args),
    },
    connection: {
      findUnique: (...args: unknown[]) => connectionFindUnique(...args),
      update: (...args: unknown[]) => connectionUpdate(...args),
      updateMany: vi.fn(),
    },
    account: {
      findMany: (...args: unknown[]) => accountFindMany(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}))
vi.mock('@/lib/rithmic-protocol/client', () => ({
  fetchFillsForAccounts: (...args: unknown[]) => fetchFillsForAccounts(...args),
  fetchInstrumentPositions: (...args: unknown[]) =>
    fetchInstrumentPositions(...args),
}))
vi.mock('@/lib/rithmic-protocol/sync-lock', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./sync-lock')>()
  return {
    ...actual,
    withProtocolSyncLock: (...args: unknown[]) => withProtocolSyncLock(...args),
  }
})
vi.mock('@/server/database', () => ({
  saveTradesAction: (...args: unknown[]) => saveTradesAction(...args),
}))
vi.mock('@/server/tick-details', () => ({
  getTickDetails: (...args: unknown[]) => getTickDetails(...args),
}))
vi.mock('@/server/connections', () => ({
  upsertAccountsForNumbers: (...args: unknown[]) =>
    upsertAccountsForNumbers(...args),
}))
vi.mock('@/app/[locale]/dashboard/connections/data', () => ({
  invalidateConnectionsPageCache: (...args: unknown[]) =>
    invalidateConnectionsPageCache(...args),
}))
vi.mock('@/lib/connection-token-crypto', () => ({
  encryptConnectionToken: (...args: unknown[]) => encryptConnectionToken(...args),
  decryptConnectionToken: vi.fn(),
}))
vi.mock('@/server/auth', () => ({
  createClient: vi.fn(),
  getUserId: vi.fn(),
}))

import { getRithmicProtocolTrades } from '@/app/[locale]/dashboard/components/import/rithmic-protocol/sync/actions'

const USER = 'user-1'
const ACCOUNT = 'LFE050-TEST'
const CONNECTION = 'conn-1'
const PROTOCOL_TRADE_SELECT = {
  id: true,
  accountNumber: true,
  instrument: true,
  entryDate: true,
  closeDate: true,
  entryId: true,
  closeId: true,
  comment: true,
  tags: true,
  imageBase64: true,
  imageBase64Second: true,
  videoUrl: true,
  images: true,
  groupId: true,
}

function tokenJson(extra?: Record<string, unknown>) {
  return JSON.stringify({
    username: 'trader',
    password: 'secret',
    systemName: 'Rithmic',
    gatewayUri: 'wss://rprotocol.rithmic.com:443',
    accountIds: [ACCOUNT],
    historyStartDate: '2026-10-01',
    ...extra,
  })
}

function snapshot(overrides?: Record<string, unknown>) {
  return {
    positions: [],
    complete: true,
    capturedAtMs: Date.parse('2026-10-06T18:00:00.000Z'),
    capturedUntilMs: Date.parse('2026-10-06T18:00:01.000Z'),
    evidenceAccountIds: [ACCOUNT],
    requestedAccountIds: [ACCOUNT],
    noDataAccountIds: [],
    incompleteAccountIds: [],
    rejectedAccountIds: [],
    ...overrides,
  }
}

function fillRow(overrides: {
  fillId: string
  transactionType?: string
  fillPrice?: number
  ssboe: number
  fillDate: string
}) {
  return {
    accountId: ACCOUNT,
    symbol: 'MESZ6',
    transactionType: overrides.transactionType ?? 'BUY',
    fillPrice: overrides.fillPrice ?? 7800,
    fillSize: 1,
    fillId: overrides.fillId,
    fillDate: overrides.fillDate,
    ssboe: overrides.ssboe,
    source: 'history' as const,
  }
}

function fetchedFills(
  rawFills: ReturnType<typeof fillRow>[],
  weeklyCloseIso = '2026-10-02T22:00:00.000Z',
) {
  return {
    rawFills,
    fills: [],
    commissionRates: new Map(),
    fillHistory: {
      requestedStartYmd: '20261001',
      anchoredStartYmd: '20260925',
      weeklyCloseIso,
      endYmd: '20261006',
      complete: true,
      windowsFailed: 0,
      incompleteAccountIds: [],
    },
    fillStats: {
      received: rawFills.length,
      afterDedup: rawFills.length,
      dropped: {},
      skippedAlreadySeen: 0,
    },
  }
}

function persistedTrade(overrides: Record<string, unknown> = {}) {
  return {
    id: 'overnight-2500',
    accountNumber: ACCOUNT,
    instrument: 'MES',
    entryDate: '2026-10-01T20:00:00.000Z',
    closeDate: '2026-10-05T14:00:00.000Z',
    entryId: 'ov-buy',
    closeId: 'ov-sell',
    pnl: 2500,
    comment: null,
    tags: [RITHMIC_PROTOCOL_TRADE_TAG],
    imageBase64: null,
    imageBase64Second: null,
    videoUrl: null,
    images: [],
    groupId: null,
    ...overrides,
  }
}

async function runSync(
  existing: ReturnType<typeof persistedTrade>[],
  tokenExtra?: Record<string, unknown>,
) {
  tradeFindMany.mockResolvedValue(existing)
  return getRithmicProtocolTrades(tokenJson(tokenExtra), {
    ...serverActor(USER),
    connectionId: CONNECTION,
  })
}

describe('getRithmicProtocolTrades P1/P2 (real Prisma select)', () => {
  beforeEach(() => {
    tradeFindMany.mockReset().mockResolvedValue([])
    tradeDeleteMany.mockReset().mockResolvedValue({ count: 0 })
    fillFindMany.mockReset().mockResolvedValue([])
    fillCreateMany.mockReset().mockResolvedValue({ count: 0 })
    fillUpdateMany.mockReset().mockResolvedValue({ count: 0 })
    connectionFindUnique.mockReset()
    connectionUpdate.mockReset().mockResolvedValue({ id: CONNECTION })
    accountFindMany.mockReset().mockResolvedValue([{ id: 'acct-1', number: ACCOUNT }])
    transaction.mockReset().mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return arg({
          rithmicProtocolFill: {
            findMany: fillFindMany,
            createMany: fillCreateMany,
            updateMany: fillUpdateMany,
          },
          trade: { findMany: tradeFindMany, deleteMany: tradeDeleteMany },
        })
      }
      return Promise.all(arg as Promise<unknown>[])
    })
    withProtocolSyncLock.mockReset().mockImplementation(
      async (
        _keys: unknown,
        fn: (guard: { throwIfLost: () => void }) => Promise<unknown>,
      ) => fn({ throwIfLost: () => {} }),
    )
    saveTradesAction.mockReset().mockResolvedValue({
      error: false,
      numberOfTradesAdded: 1,
    })
    getTickDetails.mockReset().mockResolvedValue([
      { ticker: 'MES', tickSize: 0.25, tickValue: 1.25 },
    ])
    upsertAccountsForNumbers.mockReset().mockResolvedValue(new Map([[ACCOUNT, 'acct-1']]))
    invalidateConnectionsPageCache.mockReset()
    encryptConnectionToken.mockReset().mockReturnValue('enc')
    fetchInstrumentPositions.mockReset().mockResolvedValue(snapshot())
    fetchFillsForAccounts.mockReset()
  })

  it('P1: a new connection does not persist the anchored prefix before historyStart', async () => {
    fetchFillsForAccounts.mockResolvedValue(
      fetchedFills(
        [
          fillRow({
            fillId: 'legacy-open',
            ssboe: Date.parse('2026-09-15T13:00:00Z') / 1000,
            fillDate: '20260915',
          }),
          fillRow({
            fillId: 'legacy-close',
            transactionType: 'SELL',
            fillPrice: 7801,
            ssboe: Date.parse('2026-09-15T14:00:00Z') / 1000,
            fillDate: '20260915',
          }),
          fillRow({
            fillId: 'new-open',
            ssboe: Date.parse('2026-10-05T13:00:00Z') / 1000,
            fillDate: '20261005',
          }),
          fillRow({
            fillId: 'new-close',
            transactionType: 'SELL',
            fillPrice: 7801,
            ssboe: Date.parse('2026-10-05T14:00:00Z') / 1000,
            fillDate: '20261005',
          }),
        ],
        '2026-09-25T22:00:00.000Z',
      ),
    )
    const result = await runSync([])
    expect(result.error).toBeUndefined()
    const selectCall = tradeFindMany.mock.calls.find((call) => {
      const arg = call[0] as { select?: Record<string, boolean> }
      return arg?.select?.entryId === true && arg?.select?.closeId === true
    })
    expect(selectCall?.[0]).toMatchObject({ select: PROTOCOL_TRADE_SELECT })
    const persisted = saveTradesAction.mock.calls[0]?.[0] as Array<{
      entryId?: string
      closeDate?: string
    }>
    expect(persisted.every((trade) => !String(trade.entryId).includes('legacy'))).toBe(
      true,
    )
    expect(
      persisted.some((trade) => Date.parse(trade.closeDate ?? '') >= Date.parse('2026-10-01')),
    ).toBe(true)
  })

  it('P2: pinning keeps a stored overnight trade when the weekly close advances past its entry', async () => {
    const overnight = persistedTrade()
    fetchFillsForAccounts.mockResolvedValue(
      fetchedFills(
        [
          fillRow({
            fillId: 'ov-buy',
            fillPrice: 7800,
            ssboe: Date.parse('2026-10-01T20:00:00Z') / 1000,
            fillDate: '20261001',
          }),
          fillRow({
            fillId: 'ov-sell',
            transactionType: 'SELL',
            fillPrice: 8300,
            ssboe: Date.parse('2026-10-05T14:00:00Z') / 1000,
            fillDate: '20261005',
          }),
        ],
        '2026-10-02T22:00:00.000Z',
      ),
    )
    const result = await runSync([overnight])
    expect(result.error).toBeUndefined()
    const persisted = saveTradesAction.mock.calls[0]?.[0] as Array<{
      entryId?: string
      closeId?: string
      pnl?: number
      tags?: string[]
    }>
    const real = persisted.find((trade) => trade.closeId === 'ov-sell')
    expect(real?.entryId).toBe('ov-buy')
    expect(real?.pnl).toBeCloseTo(2500)
    expect(real?.tags?.includes('rithmic-protocol-opening-seed')).toBeFalsy()
    const deleted = tradeDeleteMany.mock.calls.map(
      (call) => (call[0] as { where?: { id?: { in?: string[] } } })?.where?.id?.in ?? [],
    )
    expect(deleted.flat()).not.toContain('overnight-2500')
    const pinUpdate = connectionUpdate.mock.calls.find((call) => {
      const data = (call[0] as { data?: { token?: string } }).data
      return typeof data?.token === 'string'
    })
    expect(pinUpdate).toBeTruthy()
  })

  it('P3: annotated leftovers stay when the Prisma select omits side/qty/prices', async () => {
    fetchFillsForAccounts.mockResolvedValue(
      fetchedFills([
        fillRow({
          fillId: 'a',
          ssboe: Date.parse('2026-10-05T13:00:00Z') / 1000,
          fillDate: '20261005',
        }),
        fillRow({
          fillId: 'b',
          transactionType: 'SELL',
          fillPrice: 7801,
          ssboe: Date.parse('2026-10-05T14:00:00Z') / 1000,
          fillDate: '20261005',
        }),
      ]),
    )
    const annotated = persistedTrade({
      id: 'keep-note',
      entryId: 'a',
      closeId: 'b',
      entryDate: '2026-10-05T13:00:00.000Z',
      closeDate: '2026-10-05T14:00:00.000Z',
      comment: 'keep this note',
      pnl: 5,
    })
    await runSync([annotated])
    const selectCall = tradeFindMany.mock.calls[0]?.[0] as {
      select?: { side?: boolean; quantity?: boolean; entryPrice?: boolean }
    }
    expect(selectCall.select?.side).toBeUndefined()
    expect(selectCall.select?.quantity).toBeUndefined()
    expect(selectCall.select?.entryPrice).toBeUndefined()
    const deleted = tradeDeleteMany.mock.calls.map(
      (call) => (call[0] as { where?: { id?: { in?: string[] } } })?.where?.id?.in ?? [],
    )
    expect(deleted.flat()).not.toContain('keep-note')
  })

  it('P6: B-S-B-S-B flatten does not swap long profits for seeded shorts', async () => {
    const ssboe = (iso: string) => Date.parse(iso) / 1000
    fetchFillsForAccounts.mockResolvedValue(
      fetchedFills(
        [
          fillRow({ fillId: 'b1', fillPrice: 100, ssboe: ssboe('2026-10-05T14:00:00Z'), fillDate: '20261005' }),
          fillRow({
            fillId: 's1',
            transactionType: 'SELL',
            fillPrice: 110,
            ssboe: ssboe('2026-10-05T14:01:00Z'),
            fillDate: '20261005',
          }),
          fillRow({ fillId: 'b2', fillPrice: 100, ssboe: ssboe('2026-10-05T14:02:00Z'), fillDate: '20261005' }),
          fillRow({
            fillId: 's2',
            transactionType: 'SELL',
            fillPrice: 110,
            ssboe: ssboe('2026-10-05T14:03:00Z'),
            fillDate: '20261005',
          }),
          fillRow({ fillId: 'b3', fillPrice: 100, ssboe: ssboe('2026-10-05T14:04:00Z'), fillDate: '20261005' }),
        ],
        '2026-09-25T22:00:00.000Z',
      ),
    )
    const result = await runSync([])
    expect(result.error).toBeUndefined()
    const persisted = (saveTradesAction.mock.calls[0]?.[0] ?? []) as Array<{
      side?: string
      pnl?: number
      entryId?: string
    }>
    expect(persisted.length).toBeGreaterThan(0)
    expect(persisted.every((trade) => trade.side === 'Long')).toBe(true)
    expect(persisted.every((trade) => (trade.pnl ?? 0) > 0)).toBe(true)
    expect(persisted.every((trade) => !String(trade.entryId).startsWith('opening-seed:'))).toBe(
      true,
    )
  })

  it('P4: a rejected second account does not freeze the healthy login', async () => {
    const dead = 'DEAD-ACCT'
    fetchInstrumentPositions.mockResolvedValue(
      snapshot({
        complete: false,
        rejectedAccountIds: [dead],
        requestedAccountIds: [ACCOUNT, dead],
        evidenceAccountIds: [ACCOUNT],
      }),
    )
    fetchFillsForAccounts.mockResolvedValue(
      fetchedFills([
        fillRow({
          fillId: 'ok-buy',
          ssboe: Date.parse('2026-10-05T13:00:00Z') / 1000,
          fillDate: '20261005',
        }),
        fillRow({
          fillId: 'ok-sell',
          transactionType: 'SELL',
          fillPrice: 7801,
          ssboe: Date.parse('2026-10-05T14:00:00Z') / 1000,
          fillDate: '20261005',
        }),
      ]),
    )
    accountFindMany.mockResolvedValue([
      { id: 'acct-1', number: ACCOUNT },
      { id: 'acct-dead', number: dead },
    ])
    const result = await runSync([], { accountIds: [ACCOUNT, dead] })
    expect(result.error).toBeUndefined()
    expect(result.syncStatus).toBe('ok')
    expect(saveTradesAction).toHaveBeenCalled()
    const stamp = connectionUpdate.mock.calls.find((call) => {
      const data = (call[0] as { data?: { lastSyncedAt?: Date } }).data
      return data?.lastSyncedAt instanceof Date
    })
    expect(stamp).toBeTruthy()
  })

  it('P5: a fill-less open hold is healthy and does not 409', async () => {
    fetchInstrumentPositions.mockResolvedValue(
      snapshot({
        positions: [{ accountId: ACCOUNT, symbol: 'MESZ6', netQuantity: 2 }],
      }),
    )
    fetchFillsForAccounts.mockResolvedValue(fetchedFills([]))
    const result = await runSync([])
    expect(result.error).toBeUndefined()
    expect(result.syncStatus).toBe('ok')
    expect(result.syncStats?.openTradesSkipped).toBe(2)
    expect(saveTradesAction).not.toHaveBeenCalled()
    const stamp = connectionUpdate.mock.calls.find((call) => {
      const data = (call[0] as { data?: { lastSyncedAt?: Date } }).data
      return data?.lastSyncedAt instanceof Date
    })
    expect(stamp).toBeTruthy()
  })

  it('P7: an empty snapshot without 451 evidence does not FIFO-start flat leftover fills', async () => {
    fetchInstrumentPositions.mockResolvedValue(
      snapshot({ evidenceAccountIds: [], positions: [] }),
    )
    fetchFillsForAccounts.mockResolvedValue(
      fetchedFills([
        fillRow({
          fillId: 'leftover-buy',
          ssboe: Date.parse('2026-10-05T14:00:00Z') / 1000,
          fillDate: '20261005',
        }),
      ]),
    )
    const result = await runSync([])
    expect(result.syncStatus).toBe('degraded')
    expect(saveTradesAction).not.toHaveBeenCalled()
  })
})
