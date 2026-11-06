import { describe, expect, it } from 'vitest'
import { teamTraderPerformance } from './trader-stats'

describe('teamTraderPerformance', () => {
  it('drops opening-seed closes from team counts and win rate', () => {
    const result = teamTraderPerformance(
      [
        {
          entryId: '1001',
          pnl: 100,
          commission: 0,
          entryDate: '2026-03-02T14:00:00.000Z',
        },
        {
          entryId: 'opening-seed:acct:ES',
          pnl: 999,
          commission: 4.5,
          entryDate: '2026-03-02T14:01:00.000Z',
        },
      ],
      'entryDate',
    )
    expect(result.statistics.totalTrades).toBe(1)
    expect(result.statistics.totalPnL).toBe(100)
    expect(result.statistics.winRate).toBe(100)
    expect(result.trades).toHaveLength(1)
  })
})
