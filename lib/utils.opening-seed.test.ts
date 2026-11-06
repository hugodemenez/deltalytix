import { describe, expect, it } from 'vitest'
import type { Trade } from '@/prisma/generated/prisma/browser'
import {
  OPENING_SEED_ORDER_ID_PREFIX,
  RITHMIC_PROTOCOL_OPENING_SEED_TAG,
} from '@/lib/opening-seed'
import { RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
import { calculateStatistics, calculateTradingDays } from '@/lib/utils'

function trade(
  overrides: Partial<Trade> & { id: string; pnl: number; entryDate: string },
): Trade {
  return {
    accountNumber: 'A1',
    accountId: 'acct-1',
    quantity: 1,
    entryId: overrides.id,
    closeId: overrides.id,
    instrument: 'ES',
    entryPrice: '1',
    closePrice: '1',
    closeDate: overrides.entryDate,
    timeInPosition: 60,
    userId: 'user-1',
    side: 'long',
    commission: 0,
    createdAt: new Date(overrides.entryDate),
    comment: null,
    tags: [],
    imageBase64: null,
    videoUrl: null,
    imageBase64Second: null,
    groupId: null,
    images: [],
    ...overrides,
  } as Trade
}

describe('opening-seed closes in dashboard aggregates', () => {
  it('drops seed-closes from calculateStatistics and calculateTradingDays', () => {
    const trades = [
      trade({ id: 'real', pnl: 50, entryDate: '2026-03-02T15:00:00.000Z' }),
      trade({
        id: 'seed',
        pnl: 999,
        entryDate: '2026-03-03T15:00:00.000Z',
        entryId: `${OPENING_SEED_ORDER_ID_PREFIX}A1:ES`,
        tags: [RITHMIC_PROTOCOL_TRADE_TAG, RITHMIC_PROTOCOL_OPENING_SEED_TAG],
      }),
    ]
    const stats = calculateStatistics(trades)
    expect(stats.nbTrades).toBe(1)
    expect(stats.cumulativePnl).toBe(50)
    expect(stats.nbWin).toBe(1)

    const days = calculateTradingDays(trades)
    expect(days.totalTradingDays).toBe(1)
    expect(days.dailyPnL).toEqual({ '2026-03-02': 50 })
  })
})
