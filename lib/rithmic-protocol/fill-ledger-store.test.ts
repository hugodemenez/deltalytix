import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RithmicProtocolFill } from './types'
import { fillIdentityKey, markFillSource } from './dedupe-fills'

const createMany = vi.fn()
const updateMany = vi.fn()
const findMany = vi.fn()
const deleteMany = vi.fn()
const transaction = vi.fn()

vi.mock('@/lib/prisma', () => {
  const client = {
    rithmicProtocolFill: {
      createMany: (...args: unknown[]) => createMany(...args),
      updateMany: (...args: unknown[]) => updateMany(...args),
      findMany: (...args: unknown[]) => findMany(...args),
    },
    trade: {
      findMany: (...args: unknown[]) => findMany(...args),
      deleteMany: (...args: unknown[]) => deleteMany(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  }
  return { prisma: client, prismaBase: client }
})

import { RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
import {
  deleteUnannotatedPhantomProtocolTrades,
  normalizePersistedFillSource,
  upsertRithmicProtocolFills,
} from './fill-ledger-store'

const ACCOUNT = 'LFE050-TEST-LEDGER'
const at = (iso: string) => Date.parse(iso) / 1000

function fill(
  overrides: Partial<RithmicProtocolFill> & { fillId: string; ssboe: number },
): RithmicProtocolFill {
  return {
    accountId: ACCOUNT,
    symbol: 'MESZ6',
    transactionType: 'BUY',
    fillPrice: 7800,
    fillSize: 1,
    fillDate: '20260930',
    ...overrides,
  }
}

describe('normalizePersistedFillSource', () => {
  it('keeps manual and replay and treats anything else as history', () => {
    expect(normalizePersistedFillSource('manual')).toBe('manual')
    expect(normalizePersistedFillSource('manual-retired')).toBe('manual-retired')
    expect(normalizePersistedFillSource('replay')).toBe('replay')
    expect(normalizePersistedFillSource('history')).toBe('history')
    expect(normalizePersistedFillSource('nope')).toBe('history')
    expect(normalizePersistedFillSource(null)).toBe('history')
  })
})

describe('upsertRithmicProtocolFills', () => {
  beforeEach(() => {
    createMany.mockReset().mockResolvedValue({ count: 1 })
    updateMany.mockReset().mockResolvedValue({ count: 1 })
    transaction.mockReset().mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return arg({
          rithmicProtocolFill: {
            createMany,
            updateMany,
            findMany,
          },
          trade: { findMany, deleteMany },
        })
      }
      return arg
    })
  })

  it('inserts novel identities and upgrades replay→history on the same key', async () => {
    const history = markFillSource(
      [fill({ fillId: '1001', ssboe: at('2026-09-30T14:00:00Z') })],
      'history',
    )[0]
    const storedReplay = { ...history, source: 'replay' as const }
    const novel = markFillSource(
      [
        fill({
          fillId: '1002',
          transactionType: 'SELL',
          fillPrice: 7801,
          ssboe: at('2026-09-30T14:05:00Z'),
        }),
      ],
      'history',
    )[0]

    const result = await upsertRithmicProtocolFills({
      userId: 'user-1',
      fills: [history, novel],
      stored: [storedReplay],
      accountIdByNumber: new Map([[ACCOUNT, 'acct-1']]),
      connectionId: 'conn-1',
    })

    expect(result).toEqual({ inserted: 1, updated: 1, skipped: 0 })
    expect(createMany).toHaveBeenCalledTimes(1)
    const inserted = createMany.mock.calls[0][0].data as Array<{
      identityKey: string
      fillId: string
      source: string
    }>
    expect(inserted).toHaveLength(1)
    expect(inserted[0].identityKey).toBe(fillIdentityKey(novel))
    expect(inserted[0].fillId).toBe('1002')
    expect(inserted[0].source).toBe('history')
    expect(updateMany).toHaveBeenCalledTimes(1)
    expect(transaction).toHaveBeenCalledTimes(1)
  })

  it('inserts a manual fill as manual and does not overwrite it on resync', async () => {
    const manual = markFillSource(
      [fill({ fillId: 'manual-gap', fillSize: 2, ssboe: at('2026-09-25T15:07:00Z') })],
      'manual',
    )[0]
    const history = markFillSource(
      [
        fill({
          fillId: '1002',
          transactionType: 'SELL',
          fillPrice: 7801,
          ssboe: at('2026-09-25T15:10:00Z'),
        }),
      ],
      'history',
    )[0]

    const insertedManual = await upsertRithmicProtocolFills({
      userId: 'user-1',
      fills: [manual],
      stored: [],
      accountIdByNumber: new Map([[ACCOUNT, 'acct-1']]),
    })
    expect(insertedManual).toEqual({ inserted: 1, updated: 0, skipped: 0 })
    const manualRow = createMany.mock.calls[0][0].data[0] as { source: string; fillId: string }
    expect(manualRow.source).toBe('manual')
    expect(manualRow.fillId).toBe('manual-gap')

    createMany.mockClear()
    updateMany.mockClear()
    const resync = await upsertRithmicProtocolFills({
      userId: 'user-1',
      fills: [history],
      stored: [manual],
      accountIdByNumber: new Map([[ACCOUNT, 'acct-1']]),
    })
    expect(resync).toEqual({ inserted: 1, updated: 0, skipped: 0 })
    expect(updateMany).not.toHaveBeenCalled()
    const historyRow = createMany.mock.calls[0][0].data[0] as { fillId: string; source: string }
    expect(historyRow.fillId).toBe('1002')
    expect(historyRow.source).toBe('history')
  })
})

describe('deleteUnannotatedPhantomProtocolTrades', () => {
  const stored = {
    id: 'stored-manual-trade',
    accountNumber: ACCOUNT,
    instrument: 'MES',
    entryDate: '2026-09-25T15:07:00.000Z',
    closeDate: '2026-09-25T15:08:00.000Z',
    entryId: 'manual-gap',
    closeId: '1002',
    side: 'Long',
    quantity: 1,
    entryPrice: '7800',
    closePrice: '7801',
    comment: null as string | null,
    tags: [RITHMIC_PROTOCOL_TRADE_TAG],
    imageBase64: null,
    imageBase64Second: null,
    videoUrl: null,
    images: [] as string[],
    groupId: null as string | null,
  }
  const plant = {
    id: 'plant-trade',
    accountNumber: ACCOUNT,
    instrument: 'MES',
    entryDate: '2026-09-25T15:07:04.000Z',
    closeDate: '2026-09-25T15:08:00.000Z',
    entryId: '88421',
    closeId: '1002',
    side: 'Long',
    quantity: 1,
    entryPrice: '7800',
    closePrice: '7801',
  }

  async function reap(
    row: typeof stored,
    derived: typeof plant,
  ) {
    const tradeFindMany = vi.fn(
      async (args: { select?: Record<string, boolean> }) => {
        const select = args.select ?? {}
        const picked: Record<string, unknown> = {}
        for (const [key, enabled] of Object.entries(select)) {
          if (enabled) picked[key] = row[key as keyof typeof row]
        }
        return [picked]
      },
    )
    const tradeDeleteMany = vi.fn(async () => ({ count: 1 }))
    const result = await deleteUnannotatedPhantomProtocolTrades({
      userId: 'user-1',
      accountNumbers: [ACCOUNT],
      derivedTrades: [derived],
      ledgerFillIds: new Set(['manual-gap', '1002', '88421']),
      retiredFillIds: new Set(['manual-gap']),
      db: {
        trade: { findMany: tradeFindMany, deleteMany: tradeDeleteMany },
      } as never,
    })
    return { result, tradeFindMany, tradeDeleteMany }
  }

  it('reaps an unannotated price or qty twin and counts an annotated one', async () => {
    const priceTwin = { ...plant, entryPrice: '7800.5' }
    const qtyTwin = { ...plant, quantity: 2 }
    const noted = { ...stored, comment: 'kept note' }

    const pricePlain = await reap(stored, priceTwin)
    expect(pricePlain.tradeFindMany.mock.calls[0][0].select).toMatchObject({
      side: true,
      quantity: true,
      entryPrice: true,
      closePrice: true,
    })
    expect(pricePlain.result).toEqual({ removed: 1, retiredManualTradesKept: 0 })
    expect(pricePlain.tradeDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['stored-manual-trade'] } }),
      }),
    )

    const qtyPlain = await reap(stored, qtyTwin)
    expect(qtyPlain.result).toEqual({ removed: 1, retiredManualTradesKept: 0 })
    expect(qtyPlain.tradeDeleteMany).toHaveBeenCalledTimes(1)

    const priceNoted = await reap(noted, priceTwin)
    expect(priceNoted.result).toEqual({ removed: 0, retiredManualTradesKept: 1 })
    expect(priceNoted.tradeDeleteMany).not.toHaveBeenCalled()

    const qtyNoted = await reap(noted, qtyTwin)
    expect(qtyNoted.result).toEqual({ removed: 0, retiredManualTradesKept: 1 })
    expect(qtyNoted.tradeDeleteMany).not.toHaveBeenCalled()

    const exact = await reap(stored, plant)
    expect(exact.result).toEqual({ removed: 0, retiredManualTradesKept: 0 })
    expect(exact.tradeDeleteMany).not.toHaveBeenCalled()
  })
})
