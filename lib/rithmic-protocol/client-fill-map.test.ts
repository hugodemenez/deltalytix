import { describe, expect, it } from 'vitest'
import { mapShowFillHistoryRow } from './client'

describe('mapShowFillHistoryRow', () => {
  it('accepts fill_price when present', () => {
    const fill = mapShowFillHistoryRow(
      {
        symbol: 'ESH6',
        fillPrice: 5000.25,
        fillSize: 2,
        transactionType: 'BUY',
      },
      'acct-1',
    )
    expect(fill).toMatchObject({
      accountId: 'acct-1',
      symbol: 'ESH6',
      fillPrice: 5000.25,
      fillSize: 2,
    })
  })

  it('falls back to avg_fill_price then price (prop-firm plants)', () => {
    expect(
      mapShowFillHistoryRow(
        { symbol: 'NQH6', avgFillPrice: 21000, fillSize: 1 },
        'acct-2',
      )?.fillPrice,
    ).toBe(21000)

    expect(
      mapShowFillHistoryRow(
        { symbol: 'NQH6', price: 21001.5, fillSize: 1 },
        'acct-2',
      )?.fillPrice,
    ).toBe(21001.5)
  })

  it('skips rows without a usable symbol, price, or size', () => {
    expect(
      mapShowFillHistoryRow({ fillPrice: 1, fillSize: 1 }, 'acct'),
    ).toBeNull()
    expect(
      mapShowFillHistoryRow({ symbol: 'ESH6', fillSize: 1 }, 'acct'),
    ).toBeNull()
    expect(
      mapShowFillHistoryRow({ symbol: 'ESH6', fillPrice: 1, fillSize: 0 }, 'acct'),
    ).toBeNull()
  })
})
