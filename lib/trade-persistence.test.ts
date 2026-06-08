import { describe, expect, it } from 'vitest'
import type { Trade } from '@/prisma/generated/prisma/client'
import {
  generateTradeUUID,
  getBrokerTradeUpdateData,
  getStableBrokerTradeKey,
} from './trade-persistence'

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'trade-id',
    accountNumber: 'A-1',
    quantity: 1,
    entryId: 'dxfeed_123_entry',
    closeId: 'dxfeed_123_exit',
    instrument: 'ES',
    entryPrice: '5000',
    closePrice: '5005',
    entryDate: '2026-06-01T10:00:00+00:00',
    closeDate: '2026-06-01T10:05:00+00:00',
    pnl: 100,
    timeInPosition: 300,
    userId: 'user-1',
    side: 'Long',
    commission: 5,
    createdAt: new Date('2026-06-01T10:06:00Z'),
    comment: 'keep my journal note',
    tags: ['dxfeed', 'reviewed'],
    imageBase64: 'image-1',
    videoUrl: 'video-1',
    imageBase64Second: 'image-2',
    groupId: 'group-1',
    images: ['image-a'],
    ...overrides,
  }
}

describe('trade persistence helpers', () => {
  it('keeps the same generated ID when broker financial fields are corrected', () => {
    const original = makeTrade({ pnl: 95, commission: 0 })
    const corrected = makeTrade({ pnl: 100, commission: 5 })

    expect(generateTradeUUID(corrected)).toBe(generateTradeUUID(original))
  })

  it('keeps financial fields in the generated ID for trades without broker IDs', () => {
    const original = makeTrade({ entryId: '', closeId: '', pnl: 95, commission: 0 })
    const corrected = makeTrade({ entryId: '', closeId: '', pnl: 100, commission: 5 })

    expect(generateTradeUUID(corrected)).not.toBe(generateTradeUUID(original))
  })

  it('uses non-empty broker entry and close IDs as a stable trade key', () => {
    const trade = makeTrade()

    expect(getStableBrokerTradeKey(trade)).toBe(
      'user-1|A-1|dxfeed_123_entry|dxfeed_123_exit',
    )
    expect(getStableBrokerTradeKey({ ...trade, closeId: '' })).toBeNull()
  })

  it('updates broker-derived fields without overwriting user annotations', () => {
    const updateData = getBrokerTradeUpdateData(
      makeTrade({ pnl: 120, commission: 7, comment: 'user note' }),
    )

    expect(updateData).toEqual({
      quantity: 1,
      instrument: 'ES',
      entryPrice: '5000',
      closePrice: '5005',
      entryDate: '2026-06-01T10:00:00+00:00',
      closeDate: '2026-06-01T10:05:00+00:00',
      pnl: 120,
      timeInPosition: 300,
      side: 'Long',
      commission: 7,
    })
    expect(updateData).not.toHaveProperty('comment')
    expect(updateData).not.toHaveProperty('tags')
    expect(updateData).not.toHaveProperty('images')
  })
})

