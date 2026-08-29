import { describe, expect, it } from 'vitest'
import { v5 as uuidv5 } from 'uuid'
import {
  generatePersistedTradeUUID,
  RITHMIC_PROTOCOL_TRADE_TAG,
} from './trade-id-utils'

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
