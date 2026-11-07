import { describe, expect, it } from 'vitest'
import { buildTradesFromRithmicFills } from './fills-to-trades'
import type { RithmicProtocolFill } from './types'
import {
  computeOpeningPositionChecks,
  formatOpeningNotFlatReport,
  groupFillsByExactSymbol,
  incomingFillTimestampError,
  isPreAnchorTrade,
  nonFlatOpeningChecks,
} from './opening-position'

const ACCOUNT = 'LFE050-JEREMIE'
const SYMBOL = 'MESZ6'
const TICK = new Map([['MES', { tickSize: 0.25, tickValue: 1.25 }]])

function fill(params: {
  id: string
  side: 'BUY' | 'SELL'
  size?: number
  price?: number
  ssboe: number
  symbol?: string
}): RithmicProtocolFill {
  return {
    accountId: ACCOUNT,
    symbol: params.symbol ?? SYMBOL,
    transactionType: params.side,
    fillPrice: params.price ?? 5800,
    fillSize: params.size ?? 1,
    fillId: params.id,
    ssboe: params.ssboe,
    source: 'history',
  }
}

/** 328 buy fills and 330 sell fills after the weekend close. */
function jeremieWindowFills(includeOpeningBuys: boolean): RithmicProtocolFill[] {
  const fills: RithmicProtocolFill[] = []
  let seq = 1
  let ssboe = Date.parse('2026-11-02T15:00:00.000Z') / 1000
  const next = () => {
    ssboe += 1
    return ssboe
  }
  if (includeOpeningBuys) {
    fills.push(fill({ id: `open-${seq++}`, side: 'BUY', ssboe: next() }))
    fills.push(fill({ id: `open-${seq++}`, side: 'BUY', ssboe: next() }))
  }
  for (let i = 0; i < 328; i += 1) {
    fills.push(fill({ id: `b-${seq++}`, side: 'BUY', ssboe: next(), price: 5800 }))
    fills.push(fill({ id: `s-${seq++}`, side: 'SELL', ssboe: next(), price: 5801 }))
  }
  fills.push(fill({ id: `s-${seq++}`, side: 'SELL', ssboe: next(), price: 5799 }))
  fills.push(fill({ id: `s-${seq++}`, side: 'SELL', ssboe: next(), price: 5798 }))
  return fills
}

describe('computeOpeningPositionChecks', () => {
  it('is P_end − net(fills) per exact symbol', () => {
    const checks = computeOpeningPositionChecks({
      accountId: ACCOUNT,
      positions: [{ accountId: ACCOUNT, symbol: SYMBOL, netQuantity: 0 }],
      fills: [
        fill({ id: 'b1', side: 'BUY', size: 3, ssboe: 1_700_000_000 }),
        fill({ id: 's1', side: 'SELL', size: 1, ssboe: 1_700_000_010 }),
      ],
    })
    expect(checks).toEqual([
      {
        accountId: ACCOUNT,
        symbol: SYMBOL,
        pEnd: 0,
        net: 2,
        p0: -2,
        fillCount: 2,
        buyLots: 3,
        sellLots: 1,
      },
    ])
  })

  it('does not mix MESZ6 with MESH7', () => {
    const checks = computeOpeningPositionChecks({
      accountId: ACCOUNT,
      positions: [
        { accountId: ACCOUNT, symbol: 'MESZ6', netQuantity: 1 },
        { accountId: ACCOUNT, symbol: 'MESH7', netQuantity: 0 },
      ],
      fills: [
        fill({ id: 'z', side: 'BUY', symbol: 'MESZ6', ssboe: 1 }),
        fill({ id: 'h', side: 'SELL', symbol: 'MESH7', ssboe: 2 }),
      ],
    })
    expect(checks.find((row) => row.symbol === 'MESZ6')?.p0).toBe(0)
    expect(checks.find((row) => row.symbol === 'MESH7')?.p0).toBe(1)
  })

  it('treats a missing snapshot row as P_end = 0', () => {
    const checks = computeOpeningPositionChecks({
      accountId: ACCOUNT,
      positions: [],
      fills: [fill({ id: 'b1', side: 'BUY', ssboe: 1 })],
    })
    expect(checks[0]?.pEnd).toBe(0)
    expect(checks[0]?.p0).toBe(-1)
  })
})

describe("Jérémie's Lucid book (328 buys, 330 sells, P_end = 0)", () => {
  it('refuses at an anchor where the two opening buys are outside the window', () => {
    const fills = jeremieWindowFills(false)
    const buys = fills.filter((row) => row.transactionType === 'BUY').length
    const sells = fills.filter((row) => row.transactionType === 'SELL').length
    expect(buys).toBe(328)
    expect(sells).toBe(330)

    const checks = computeOpeningPositionChecks({
      accountId: ACCOUNT,
      positions: [{ accountId: ACCOUNT, symbol: SYMBOL, netQuantity: 0 }],
      fills,
    })
    expect(checks[0]).toMatchObject({
      pEnd: 0,
      net: -2,
      p0: 2,
      buyLots: 328,
      sellLots: 330,
    })
    expect(nonFlatOpeningChecks(checks)).toHaveLength(1)
    expect(formatOpeningNotFlatReport(checks)).toContain('MESZ6: P_0=+2')
    expect(formatOpeningNotFlatReport(checks)).toContain('328 buy lots / 330 sell lots')
    expect(formatOpeningNotFlatReport(checks)).toMatch(/earlier Friday/)
  })

  it('is flat when the same two opening buys are inside the window', () => {
    const fills = jeremieWindowFills(true)
    const buys = fills.filter((row) => row.transactionType === 'BUY').length
    const sells = fills.filter((row) => row.transactionType === 'SELL').length
    expect(buys).toBe(330)
    expect(sells).toBe(330)

    const checks = computeOpeningPositionChecks({
      accountId: ACCOUNT,
      positions: [{ accountId: ACCOUNT, symbol: SYMBOL, netQuantity: 0 }],
      fills,
    })
    expect(checks[0]).toMatchObject({ pEnd: 0, net: 0, p0: 0 })
    expect(nonFlatOpeningChecks(checks)).toEqual([])
  })

  it('FIFO on the flat window produces no phantom shorts', () => {
    const fills = jeremieWindowFills(true)
    const grouped = groupFillsByExactSymbol(fills)
    const derived = buildTradesFromRithmicFills(
      grouped.get(`${ACCOUNT}|${SYMBOL}`) ?? [],
      'user-1',
      TICK,
    )
    expect(derived.openSkipped).toBe(0)
    expect(derived.trades.every((trade) => trade.side === 'Long')).toBe(true)
    expect(derived.trades.some((trade) => trade.side === 'Short')).toBe(false)
  })

  it('FIFO on the non-flat window leaves two leftover short lots — which the rebuild must refuse', () => {
    const fills = jeremieWindowFills(false)
    const derived = buildTradesFromRithmicFills(fills, 'user-1', TICK)
    expect(derived.openSkipped).toBe(2)
  })

  it('refuses the sells-first carried shape (Q1) instead of inventing shorts', () => {
    const fills = [
      fill({ id: 's1', side: 'SELL', price: 110, ssboe: 10 }),
      fill({ id: 's2', side: 'SELL', price: 111, ssboe: 11 }),
      fill({ id: 'b1', side: 'BUY', price: 100, ssboe: 12 }),
      fill({ id: 's3', side: 'SELL', price: 105, ssboe: 13 }),
    ]
    const checks = computeOpeningPositionChecks({
      accountId: ACCOUNT,
      positions: [{ accountId: ACCOUNT, symbol: SYMBOL, netQuantity: 0 }],
      fills,
    })
    expect(checks[0]?.p0).toBe(2)
    expect(nonFlatOpeningChecks(checks)).toHaveLength(1)
    const derived = buildTradesFromRithmicFills(fills, 'user-1', TICK)
    expect(derived.trades.some((trade) => trade.side === 'Short')).toBe(true)
  })
})

describe('isPreAnchorTrade', () => {
  const fridayClose = Date.parse('2026-10-30T22:00:00.000Z')

  it('keeps a row that closed before the weekend close', () => {
    expect(
      isPreAnchorTrade(
        {
          entryDate: '2026-10-29T18:00:00.000Z',
          closeDate: '2026-10-30T20:00:00.000Z',
        },
        fridayClose,
      ),
    ).toBe(true)
  })

  it('treats a row that closed at or after the close as in-window', () => {
    expect(
      isPreAnchorTrade(
        {
          entryDate: '2026-11-02T15:00:00.000Z',
          closeDate: '2026-11-02T15:05:00.000Z',
        },
        fridayClose,
      ),
    ).toBe(false)
  })

  it('retains an undated row rather than deleting it', () => {
    expect(isPreAnchorTrade({ entryDate: null, closeDate: null }, fridayClose)).toBe(
      true,
    )
  })
})

describe('incomingFillTimestampError', () => {
  it('refuses timestamp 0 before the window filter', () => {
    expect(
      incomingFillTimestampError(
        [
          {
            accountId: ACCOUNT,
            symbol: SYMBOL,
            transactionType: 'BUY',
            fillPrice: 1,
            fillSize: 1,
            fillId: 'ghost',
          },
        ],
        '2026-10-30',
      ),
    ).toBe('FILLS_MISSING_TIMESTAMP')
  })

  it('refuses a no-ssboe fill dated on or after the anchor', () => {
    expect(
      incomingFillTimestampError(
        [
          {
            accountId: ACCOUNT,
            symbol: SYMBOL,
            transactionType: 'BUY',
            fillPrice: 1,
            fillSize: 1,
            fillId: 'late',
            fillDate: '20261030',
            fillTime: '18:00:00',
          },
        ],
        '2026-10-30',
      ),
    ).toBe('FILLS_MISSING_SSBOE')
  })
})
