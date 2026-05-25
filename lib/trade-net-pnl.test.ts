import { describe, expect, it } from 'vitest'
import { getTradeGrossPnl, getTradeNetPnl, isCommissionIncludedInTradePnl } from './trade-net-pnl'

describe('trade-net-pnl', () => {
  it('subtracts commission for standard imports', () => {
    expect(getTradeNetPnl({ pnl: 17.5, commission: 5, tags: [] })).toBe(12.5)
    expect(isCommissionIncludedInTradePnl({ pnl: 17.5, commission: 5, tags: [] })).toBe(false)
  })

  it('does not subtract commission for dxfeed (net already in pnl)', () => {
    expect(getTradeNetPnl({ pnl: 12.5, commission: 5, tags: ['dxfeed'] })).toBe(12.5)
    expect(getTradeGrossPnl({ pnl: 12.5, commission: 5, tags: ['dxfeed'] })).toBe(17.5)
    expect(isCommissionIncludedInTradePnl({ pnl: 12.5, commission: 5, tags: ['dxfeed'] })).toBe(true)
  })

  it('handles losing dxfeed trades', () => {
    expect(getTradeNetPnl({ pnl: -17.5, commission: 5, tags: ['dxfeed'] })).toBe(-17.5)
  })
})
