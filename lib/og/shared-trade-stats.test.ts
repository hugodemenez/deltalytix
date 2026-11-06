import { describe, expect, it } from 'vitest'
import { sharedOgTradeStats } from './shared-trade-stats'

describe('sharedOgTradeStats', () => {
  it('drops opening-seed closes from shared-image counts', () => {
    const stats = sharedOgTradeStats([
      { entryId: '1001', pnl: 80, commission: 2 },
      { entryId: 'opening-seed:acct:ES', pnl: 999, commission: 4.5 },
    ])
    expect(stats.totalTrades).toBe(1)
    expect(stats.totalPnl).toBe(78)
    expect(stats.winningTrades).toHaveLength(1)
  })
})
