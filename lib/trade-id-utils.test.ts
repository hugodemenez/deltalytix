import { describe, expect, it } from 'vitest'
import { v5 as uuidv5 } from 'uuid'
import {
  generatePersistedTradeUUID,
  RITHMIC_PROTOCOL_TRADE_TAG,
  TRADOVATE_TRADE_TAG,
} from './trade-id-utils'
import {
  normalizeTradeSide,
  resolveTradovatePersistedId,
  tradovateFillPairKey,
  tradovateRoundTripFillIds,
  tradovateSideFromBuyFirst,
} from './tradovate/identity'

const TRADE_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

const baseTrade = {
  userId: 'user-1',
  accountNumber: 'ACC1',
  instrument: 'MES',
  entryDate: '2024-01-02 15:00:00',
  closeDate: '2024-01-02 15:01:00',
  entryPrice: '5000',
  closePrice: '5001',
  quantity: 2,
  entryId: 'e1',
  closeId: 'x1',
  timeInPosition: 60,
  side: 'Long',
  pnl: 2.5,
}

describe('generatePersistedTradeUUID', () => {
  it('keeps Protocol identity on the pre-RMS commission=0 hash', () => {
    const historical = uuidv5(
      [
        baseTrade.userId,
        baseTrade.accountNumber,
        baseTrade.instrument,
        baseTrade.entryDate,
        baseTrade.closeDate,
        baseTrade.entryPrice,
        baseTrade.closePrice,
        '2',
        baseTrade.entryId,
        baseTrade.closeId,
        '60',
        baseTrade.side,
        '2.5',
        '0',
      ].join('|'),
      TRADE_NAMESPACE,
    )

    expect(
      generatePersistedTradeUUID({
        ...baseTrade,
        commission: 4.8,
        tags: [RITHMIC_PROTOCOL_TRADE_TAG],
      }),
    ).toBe(historical)
    expect(
      generatePersistedTradeUUID({
        ...baseTrade,
        commission: 0,
        tags: [RITHMIC_PROTOCOL_TRADE_TAG],
      }),
    ).toBe(historical)
  })

  it('still includes commission for non-Protocol imports', () => {
    const zero = generatePersistedTradeUUID({ ...baseTrade, commission: 0 })
    const charged = generatePersistedTradeUUID({ ...baseTrade, commission: 4.8 })
    expect(zero).not.toBe(charged)
  })
})

describe('Tradovate cross-source persisted identity', () => {
  const userId = 'local-dashboard-user'
  const accountNumber = 'SAMARKAND-CHALLENGE'
  const buyFillId = '88451221'
  const sellFillId = '88451288'

  const syncLong = {
    userId,
    accountNumber,
    instrument: 'MES',
    entryDate: '2026-03-10T14:35:12.000+00:00',
    closeDate: '2026-03-10T14:42:15.000+00:00',
    entryPrice: '5125.25',
    closePrice: '5130.5',
    quantity: 2,
    entryId: `fill_${buyFillId}`,
    closeId: `fill_${sellFillId}`,
    timeInPosition: 423,
    side: 'Long',
    pnl: 52.5,
    commission: 3.28,
    tags: [TRADOVATE_TRADE_TAG],
  }

  const csvLong = {
    userId,
    accountNumber,
    instrument: 'MES',
    entryDate: '2026-03-10T09:35:12.000+00:00',
    closeDate: '2026-03-10T09:42:15.000+00:00',
    entryPrice: '5125.25',
    closePrice: '5130.50',
    quantity: 2,
    entryId: buyFillId,
    closeId: sellFillId,
    timeInPosition: 423,
    side: 'long',
    pnl: 50,
    commission: 0,
    tags: [TRADOVATE_TRADE_TAG],
  }

  it('matches live sync and CSV for the same long fill despite prefix, side, pnl, and commission', () => {
    expect(generatePersistedTradeUUID(syncLong)).toBe(
      generatePersistedTradeUUID(csvLong),
    )
  })

  it('matches live sync and CSV for the same short when fill ids are swapped', () => {
    const syncShort = {
      ...syncLong,
      side: 'Short',
      entryId: `fill_${sellFillId}`,
      closeId: `fill_${buyFillId}`,
      pnl: -12.5,
      commission: 4.1,
    }
    const csvShortUnswapped = {
      ...csvLong,
      side: 'short',
      entryId: buyFillId,
      closeId: sellFillId,
      pnl: -10,
      commission: 2,
    }

    expect(generatePersistedTradeUUID(syncShort)).toBe(
      generatePersistedTradeUUID(csvShortUnswapped),
    )
  })

  it('builds the same entry/close fill ids from sync-style and CSV-style raw ids', () => {
    expect(
      tradovateRoundTripFillIds({
        buyFillId: `fill_${buyFillId}`,
        sellFillId: `fill_${sellFillId}`,
        isBuyFirst: true,
      }),
    ).toEqual(
      tradovateRoundTripFillIds({
        buyFillId,
        sellFillId,
        isBuyFirst: true,
      }),
    )
    expect(tradovateSideFromBuyFirst(true)).toBe('Long')
    expect(tradovateSideFromBuyFirst(false)).toBe('Short')
    expect(normalizeTradeSide(tradovateSideFromBuyFirst(true))).toBe(
      normalizeTradeSide('long'),
    )
  })

  it('does not collapse two different fill pairs', () => {
    expect(
      generatePersistedTradeUUID({
        ...syncLong,
        closeId: 'fill_999',
      }),
    ).not.toBe(generatePersistedTradeUUID(syncLong))
  })

  it('still treats untagged rows as generic imports (commission stays in the hash)', () => {
    const syncUntagged = { ...syncLong, tags: [] }
    const csvUntagged = { ...csvLong, tags: [] }
    expect(generatePersistedTradeUUID(syncUntagged)).not.toBe(
      generatePersistedTradeUUID(csvUntagged),
    )
  })

  it('reuses an already-persisted sync id when CSV fill ids omit the prefix', () => {
    const existingId = 'already-synced-uuid'
    expect(
      resolveTradovatePersistedId(csvLong, [
        {
          id: existingId,
          accountNumber,
          entryId: syncLong.entryId,
          closeId: syncLong.closeId,
        },
      ]),
    ).toBe(existingId)
    expect(tradovateFillPairKey(syncLong)).toBe(tradovateFillPairKey(csvLong))
  })
})
