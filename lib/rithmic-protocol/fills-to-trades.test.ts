import { describe, expect, it } from 'vitest'
import {
  buildTradesFromRithmicFills,
  fillSide,
  fillTimestampMs,
} from './fills-to-trades'
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
    expect(trades[0].commission).toBe(0)
    expect(trades[0].tags).toContain('rithmic-protocol')
  })

  it('applies product RMS commission_fill_rate on each fill', () => {
    const fills: RithmicProtocolFill[] = [
      {
        accountId: 'ACC1',
        symbol: 'MESU6',
        transactionType: 'BUY',
        fillPrice: 5000,
        fillSize: 2,
        fillId: 'e1',
        ssboe: 1_700_000_000,
      },
      {
        accountId: 'ACC1',
        symbol: 'MESU6',
        transactionType: 'SELL',
        fillPrice: 5001,
        fillSize: 2,
        fillId: 'x1',
        ssboe: 1_700_000_600,
      },
    ]
    const tickBySymbol = new Map([
      ['MES', { tickSize: 0.25, tickValue: 1.25 }],
    ])
    const commissionRates = new Map([['ACC1|MES', 1.2]])

    const { trades } = buildTradesFromRithmicFills(
      fills,
      'user-1',
      tickBySymbol,
      commissionRates,
    )

    expect(trades).toHaveLength(1)
    // Entry 2×1.20 + exit 2×1.20
    expect(trades[0].commission).toBe(4.8)
    expect(trades[0].id).toBe(
      buildTradesFromRithmicFills(fills, 'user-1', tickBySymbol).trades[0].id,
    )
  })

  it('does not join a duplicated fill_id into an id-id trade', () => {
    const fills: RithmicProtocolFill[] = [
      {
        accountId: 'PA-APEX-39878-10',
        symbol: 'ESH5',
        transactionType: 'BUY',
        fillPrice: 5000,
        fillSize: 1,
        fillId: '1452840',
        ssboe: 1_725_289_800,
      },
      {
        accountId: 'PA-APEX-39878-10',
        symbol: 'ESH5',
        transactionType: '1',
        fillPrice: 5000,
        fillSize: 1,
        fillId: '1452840-1452840',
        ssboe: 1_725_289_801,
      },
      {
        accountId: 'PA-APEX-39878-10',
        symbol: 'ESH5',
        transactionType: 'SELL',
        fillPrice: 5010,
        fillSize: 1,
        fillId: '1452900',
        ssboe: 1_725_290_400,
      },
    ]

    const { trades } = buildTradesFromRithmicFills(
      fills,
      'user-1',
      new Map([['ES', { tickSize: 0.25, tickValue: 12.5 }]]),
    )

    expect(trades).toHaveLength(1)
    expect(trades[0].entryId).toBe('1452840')
    expect(trades[0].closeId).toBe('1452900')
    expect(trades[0].quantity).toBe(1)
    expect(trades[0].pnl).toBe(500)
  })

  const mnqTicks = new Map([['MNQ', { tickSize: 0.25, tickValue: 0.5 }]])

  /** ATAS 2026-09-18 export (newest-first), FFNX-50S233903720032 MNQ. */
  const FFNX_ATAS_ROWS = [
    ['Buy', 29709.0, '18/09/2026 18:37:07', '1090509'],
    ['Sell', 29710.25, '18/09/2026 18:33:20', '1090599'],
    ['Buy', 29716.25, '18/09/2026 18:21:00', '1089150'],
    ['Sell', 29720.75, '18/09/2026 18:19:56', '1090017'],
    ['Sell', 29713.75, '18/09/2026 17:55:42', '1088631'],
    ['Buy', 29710.25, '18/09/2026 17:54:23', '1088589'],
    ['Sell', 29724.75, '18/09/2026 17:45:02', '1089669'],
    ['Buy', 29722.0, '18/09/2026 17:40:14', '1089144'],
    ['Sell', 29735.5, '18/09/2026 17:35:04', '1089117'],
    ['Buy', 29732.0, '18/09/2026 17:34:00', '1089226'],
    ['Buy', 29749.5, '18/09/2026 17:09:58', '1088541'],
    ['Sell', 29754.5, '18/09/2026 17:04:28', '1088341'],
    ['Buy', 29717.75, '18/09/2026 16:31:47', '1086640'],
    ['Sell', 29727.5, '18/09/2026 16:21:36', '1086318'],
    ['Buy', 29746.5, '18/09/2026 16:12:09', '1085188'],
    ['Sell', 29752.25, '18/09/2026 16:10:54', '1085072'],
    ['Buy', 29931.75, '18/09/2026 09:13:30', '1079693'],
    ['Sell', 29936.5, '18/09/2026 09:12:55', '1080334'],
  ] as const

  /** ATAS 2026-09-18 export, LFF050-H2P6PP65-PRO001 MNQ. */
  const H2P6_ATAS_ROWS = [
    ['Buy', 29741.0, '18/09/2026 16:24:13', '1415854'],
    ['Sell', 29745.5, '18/09/2026 16:23:57', '1416537'],
    ['Buy', 29835.0, '18/09/2026 15:42:09', '1402355'],
    ['Sell', 29842.75, '18/09/2026 15:41:32', '1402418'],
    ['Buy', 29830.0, '18/09/2026 15:40:57', '1402347'],
    ['Sell', 29838.5, '18/09/2026 15:40:41', '1401607'],
  ] as const

  function atasToFill(
    accountId: string,
    row: readonly [string, number, string, string],
    opts?: { ssboe?: boolean; fillTimeStyle?: 'colon' | 'digits' },
  ): RithmicProtocolFill {
    const [direction, price, time, fillId] = row
    const [dmy, hms] = time.split(' ')
    const [dd, mm, yyyy] = dmy.split('/')
    const iso = `${yyyy}-${mm}-${dd}T${hms}Z`
    const fillTime =
      opts?.fillTimeStyle === 'digits' ? hms.replace(/:/g, '') : hms
    return {
      accountId,
      symbol: 'MNQZ6',
      transactionType: direction,
      fillPrice: price,
      fillSize: 1,
      fillId,
      fillDate: `${yyyy}${mm}${dd}`,
      fillTime,
      ...(opts?.ssboe === false
        ? {}
        : { ssboe: Math.floor(Date.parse(iso) / 1000) }),
    }
  }

  function grossPnL(fills: RithmicProtocolFill[]) {
    const { trades, openSkipped } = buildTradesFromRithmicFills(
      fills,
      'user-1',
      mnqTicks,
    )
    return {
      trades,
      openSkipped,
      pnl: trades.reduce((sum, trade) => sum + trade.pnl, 0),
    }
  }

  it('matches a simple short round trip (sell opens, buy closes)', () => {
    const fills: RithmicProtocolFill[] = [
      {
        accountId: 'ACC1',
        symbol: 'MNQZ6',
        transactionType: 'SELL',
        fillPrice: 20000,
        fillSize: 1,
        fillId: 's1',
        ssboe: 1_700_000_000,
      },
      {
        accountId: 'ACC1',
        symbol: 'MNQZ6',
        transactionType: 'BUY',
        fillPrice: 19990,
        fillSize: 1,
        fillId: 'b1',
        ssboe: 1_700_000_600,
      },
    ]

    const { trades, openSkipped } = buildTradesFromRithmicFills(
      fills,
      'user-1',
      mnqTicks,
    )

    expect(openSkipped).toBe(0)
    expect(trades).toHaveLength(1)
    expect(trades[0].side).toBe('Short')
    expect(trades[0].entryPrice).toBe('20000')
    expect(trades[0].closePrice).toBe('19990')
    // 10 points * $2
    expect(trades[0].pnl).toBe(20)
  })

  it('does not pair a short-seller day as long-only FIFO (FFNX Sep 18)', () => {
    const fills = FFNX_ATAS_ROWS.map((row) =>
      atasToFill('FFNX-50S233903720032', row),
    )
    const { trades, openSkipped, pnl } = grossPnL(fills)

    expect(openSkipped).toBe(0)
    expect(trades).toHaveLength(9)
    expect(pnl).toBeCloseTo(81.5, 10)
    expect(trades.filter((trade) => trade.side === 'Short').length).toBeGreaterThan(
      0,
    )
    // Long-only FIFO (orphan sells dropped) pairs buy@29931.75 with
    // sell@29752.25 → fake −$359 and a day total of −$373.50.
    expect(
      trades.some(
        (trade) =>
          trade.side === 'Long' &&
          trade.entryPrice === '29931.75' &&
          trade.closePrice === '29752.25',
      ),
    ).toBe(false)
    const firstShort = trades.find((trade) => trade.entryId === '1080334')
    expect(firstShort?.side).toBe('Short')
    expect(firstShort?.closeId).toBe('1079693')
    expect(firstShort?.pnl).toBeCloseTo(9.5, 10)
  })

  it('reconstructs H2P6 Sep 18 gross PnL as +41.50', () => {
    const fills = H2P6_ATAS_ROWS.map((row) =>
      atasToFill('LFF050-H2P6PP65-PRO001', row),
    )
    const { trades, openSkipped, pnl } = grossPnL(fills)

    expect(openSkipped).toBe(0)
    expect(trades).toHaveLength(3)
    expect(trades.every((trade) => trade.side === 'Short')).toBe(true)
    expect(pnl).toBeCloseTo(41.5, 10)
  })

  it('still gets FFNX +81.50 when history is newest-first and ssboe is missing', () => {
    const fills = FFNX_ATAS_ROWS.map((row) =>
      atasToFill('FFNX-50S233903720032', row, {
        ssboe: false,
        fillTimeStyle: 'digits',
      }),
    )
    expect(fills[0].ssboe).toBeUndefined()
    expect(fillTimestampMs(fills[0])).toBeGreaterThan(0)
    expect(grossPnL(fills).pnl).toBeCloseTo(81.5, 10)
  })

  it('keeps long-only scale-in PnL when two buys flatten with two sells', () => {
    const fills: RithmicProtocolFill[] = [
      {
        accountId: 'ACC1',
        symbol: 'ESH5',
        transactionType: 'BUY',
        fillPrice: 5000,
        fillSize: 1,
        fillId: 'b1',
        ssboe: 1_700_000_000,
      },
      {
        accountId: 'ACC1',
        symbol: 'ESH5',
        transactionType: 'BUY',
        fillPrice: 5002,
        fillSize: 1,
        fillId: 'b2',
        ssboe: 1_700_000_100,
      },
      {
        accountId: 'ACC1',
        symbol: 'ESH5',
        transactionType: 'SELL',
        fillPrice: 5010,
        fillSize: 1,
        fillId: 's1',
        ssboe: 1_700_000_200,
      },
      {
        accountId: 'ACC1',
        symbol: 'ESH5',
        transactionType: 'SELL',
        fillPrice: 5008,
        fillSize: 1,
        fillId: 's2',
        ssboe: 1_700_000_300,
      },
    ]
    const { trades, openSkipped } = buildTradesFromRithmicFills(
      fills,
      'user-1',
      new Map([['ES', { tickSize: 0.25, tickValue: 12.5 }]]),
    )
    expect(openSkipped).toBe(0)
    expect(trades).toHaveLength(2)
    expect(trades.every((trade) => trade.side === 'Long')).toBe(true)
    // (10 + 6) points * $50
    expect(trades.reduce((sum, trade) => sum + trade.pnl, 0)).toBe(800)
  })

  it('reverses a long into a short when the sell is larger than open longs', () => {
    const fills: RithmicProtocolFill[] = [
      {
        accountId: 'ACC1',
        symbol: 'MNQZ6',
        transactionType: 'BUY',
        fillPrice: 20000,
        fillSize: 1,
        fillId: 'b1',
        ssboe: 1_700_000_000,
      },
      {
        accountId: 'ACC1',
        symbol: 'MNQZ6',
        transactionType: 'SELL',
        fillPrice: 20010,
        fillSize: 2,
        fillId: 's1',
        ssboe: 1_700_000_100,
      },
      {
        accountId: 'ACC1',
        symbol: 'MNQZ6',
        transactionType: 'BUY',
        fillPrice: 20000,
        fillSize: 1,
        fillId: 'b2',
        ssboe: 1_700_000_200,
      },
    ]
    const { trades, openSkipped } = grossPnL(fills)
    expect(openSkipped).toBe(0)
    expect(trades).toHaveLength(2)
    expect(trades[0].side).toBe('Long')
    expect(trades[0].quantity).toBe(1)
    expect(trades[0].pnl).toBeCloseTo(20, 10)
    expect(trades[1].side).toBe('Short')
    expect(trades[1].quantity).toBe(1)
    expect(trades[1].pnl).toBeCloseTo(20, 10)
  })
})

describe('fillSide', () => {
  it('treats Protocol history strings and notification enums as buys or sells', () => {
    expect(fillSide('BUY')).toBe('B')
    expect(fillSide('Buy')).toBe('B')
    expect(fillSide('1')).toBe('B')
    expect(fillSide('B')).toBe('B')
    expect(fillSide('SELL')).toBe('S')
    expect(fillSide('Sell')).toBe('S')
    expect(fillSide('2')).toBe('S')
    expect(fillSide('3')).toBe('S')
    expect(fillSide('SS')).toBe('S')
    expect(fillSide('SELL SHORT')).toBe('S')
  })
})
