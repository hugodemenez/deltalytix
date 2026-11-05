import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RithmicProtocolFill } from './types'
import { fillIdentityKey, markFillSource } from './dedupe-fills'

const createMany = vi.fn()
const updateMany = vi.fn()
const findMany = vi.fn()
const deleteMany = vi.fn()
const transaction = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
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
  },
}))

import { upsertRithmicProtocolFills } from './fill-ledger-store'

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

describe('upsertRithmicProtocolFills', () => {
  beforeEach(() => {
    createMany.mockReset().mockResolvedValue({ count: 1 })
    updateMany.mockReset().mockResolvedValue({ count: 1 })
    transaction.mockReset().mockImplementation(async (ops: unknown) => ops)
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
  })
})
