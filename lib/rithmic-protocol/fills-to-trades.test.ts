import { describe, expect, it } from 'vitest'
import { buildTradesFromRithmicFills } from './fills-to-trades'
import type { RithmicProtocolFill } from './types'

describe('buildTradesFromRithmicFills', () => {
  it('matches a simple long round trip', () => {
    const fills: RithmicProtocolFill[] = [
      {
        accountId: 'ACC1',
        symbol: 'ESH5',
        transactionType: 'BUY',
        fillPrice: 5000,
        fillSize: 1,
        fillId: 'e1',
        ssboe: 1_700_000_000,
      },
      {
        accountId: 'ACC1',
        symbol: 'ESH5',
        transactionType: 'SELL',
        fillPrice: 5010,
        fillSize: 1,
        fillId: 'x1',
        ssboe: 1_700_000_600,
      },
    ]

    const tickBySymbol = new Map([
      ['ES', { tickSize: 0.25, tickValue: 12.5 }],
    ])

    const { trades, openSkipped } = buildTradesFromRithmicFills(
      fills,
      'user-1',
      tickBySymbol,
    )

    expect(openSkipped).toBe(0)
    expect(trades).toHaveLength(1)
    expect(trades[0].instrument).toBe('ES')
    expect(trades[0].side).toBe('Long')
    expect(trades[0].quantity).toBe(1)
    // 10 points / 0.25 = 40 ticks * 12.5 = 500
    expect(trades[0].pnl).toBe(500)
    expect(trades[0].tags).toContain('rithmic-protocol')
  })
})
