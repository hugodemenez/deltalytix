import { describe, expect, it } from 'vitest'
import { RITHMIC_PROTOCOL_OPENING_SEED_TAG } from '@/lib/trade-id-utils'
import { buildTradesFromRithmicFills } from './fills-to-trades'
import type { RithmicProtocolFill } from './types'
import {
  computeOpeningPositionChecks,
  decideOpeningSeeds,
  isOpeningSeedOrderId,
  openingSeedOrderId,
} from './opening-position'

const ACCOUNT = 'LFE050-JEREMIE'
const tickBySymbol = new Map([['MES', { tickSize: 0.25, tickValue: 1.25 }]])
const at = (iso: string) => Date.parse(iso) / 1000
const WINDOW_START_MS = Date.parse('2026-10-23T22:00:00.000Z')

function fill(
  overrides: Partial<RithmicProtocolFill> & { fillId: string; ssboe: number },
): RithmicProtocolFill {
  return {
    accountId: ACCOUNT,
    symbol: 'MESZ6',
    transactionType: 'BUY',
    fillPrice: 7800,
    fillSize: 1,
    fillDate: '20260930',
    ...overrides,
  }
}

function overnightShorts(
  trades: Array<{ side: string | null; entryDate: string; closeDate: string }>,
) {
  return trades.filter(
    (trade) =>
      trade.side === 'Short' &&
      trade.entryDate.slice(0, 10) !== trade.closeDate.slice(0, 10),
  )
}

const roundTrip: RithmicProtocolFill[] = [
  fill({
    fillId: '1001',
    ssboe: at('2026-09-30T14:00:00Z'),
  }),
  fill({
    fillId: '1002',
    fillDate: '20260930',
    transactionType: 'SELL',
    fillPrice: 7801,
    ssboe: at('2026-09-30T14:05:00Z'),
  }),
]

const jeremieFills: RithmicProtocolFill[] = [
  fill({
    fillId: 'cover-1',
    transactionType: 'SELL',
    fillPrice: 7802,
    ssboe: at('2026-09-30T13:50:00Z'),
  }),
  fill({
    fillId: 'cover-2',
    transactionType: 'SELL',
    fillPrice: 7802.25,
    ssboe: at('2026-09-30T13:50:01Z'),
  }),
  ...roundTrip,
  fill({
    fillId: '2001',
    fillDate: '20261002',
    fillPrice: 7810,
    ssboe: at('2026-10-02T14:00:00Z'),
  }),
  fill({
    fillId: '2002',
    fillDate: '20261002',
    transactionType: 'SELL',
    fillPrice: 7811,
    ssboe: at('2026-10-02T14:10:00Z'),
  }),
]

describe('computeOpeningPositionChecks', () => {
  it('flat-at-anchor: P_end 0 and balanced fills ⇒ P_0 0', () => {
    const checks = computeOpeningPositionChecks({
      fills: roundTrip,
      positions: [],
    })
    expect(checks).toEqual([
      {
        accountId: ACCOUNT,
        symbol: 'MESZ6',
        instrument: 'MES',
        pEnd: 0,
        net: 0,
        p0: 0,
        fillCount: 2,
      },
    ])
    expect(decideOpeningSeeds(checks, roundTrip, WINDOW_START_MS).seeds).toEqual([])
    const { trades, openSkipped } = buildTradesFromRithmicFills(
      roundTrip,
      'u1',
      tickBySymbol,
    )
    expect(openSkipped).toBe(0)
    expect(trades).toHaveLength(1)
    expect(trades[0]?.side).toBe('Long')
  })

  it('Jérémie-shaped: window net −2, P_end 0 ⇒ P_0 +2, no phantom shorts', () => {
    const checks = computeOpeningPositionChecks({
      fills: jeremieFills,
      positions: [],
    })
    expect(checks).toEqual([
      {
        accountId: ACCOUNT,
        symbol: 'MESZ6',
        instrument: 'MES',
        pEnd: 0,
        net: -2,
        p0: 2,
        fillCount: 6,
      },
    ])
    const { seeds, error } = decideOpeningSeeds(
      checks,
      jeremieFills,
      WINDOW_START_MS,
    )
    expect(error).toBeUndefined()
    expect(seeds).toEqual([
      {
        accountId: ACCOUNT,
        symbol: 'MESZ6',
        netQuantity: 2,
        timestampMs: expect.any(Number),
        orderId: openingSeedOrderId(ACCOUNT, 'MESZ6'),
      },
    ])
    const unseeded = buildTradesFromRithmicFills(
      jeremieFills,
      'u1',
      tickBySymbol,
    )
    expect(overnightShorts(unseeded.trades).length).toBeGreaterThan(0)

    const seeded = buildTradesFromRithmicFills(
      jeremieFills,
      'u1',
      tickBySymbol,
      undefined,
      { openingSeeds: seeds },
    )
    expect(overnightShorts(seeded.trades)).toEqual([])
    expect(seeded.openSkipped).toBe(0)
    const seedCloses = seeded.trades.filter((trade) =>
      trade.tags?.includes(RITHMIC_PROTOCOL_OPENING_SEED_TAG),
    )
    expect(seedCloses).toHaveLength(2)
    expect(seedCloses.every((trade) => trade.pnl === 0)).toBe(true)
    expect(seedCloses.every((trade) => trade.side === 'Long')).toBe(true)
    expect(
      seedCloses.every((trade) => isOpeningSeedOrderId(trade.entryId)),
    ).toBe(true)
    const real = seeded.trades.filter(
      (trade) => !trade.tags?.includes(RITHMIC_PROTOCOL_OPENING_SEED_TAG),
    )
    expect(real).toHaveLength(2)
    expect(real.every((trade) => trade.side === 'Long')).toBe(true)
  })

  it('weekend-hold: P_0 != 0 genuinely stays open, then closes conservatively', () => {
    const held: RithmicProtocolFill[] = []
    const checks = computeOpeningPositionChecks({
      fills: held,
      positions: [{ accountId: ACCOUNT, symbol: 'MESZ6', netQuantity: 2 }],
    })
    expect(checks[0]).toMatchObject({ pEnd: 2, net: 0, p0: 2, fillCount: 0 })
    const { seeds } = decideOpeningSeeds(checks, held, WINDOW_START_MS)
    const open = buildTradesFromRithmicFills(held, 'u1', tickBySymbol, undefined, {
      openingSeeds: seeds,
    })
    expect(open.trades).toEqual([])
    expect(open.openSkipped).toBe(2)

    const closeInWindow = [
      fill({
        fillId: 'exit-1',
        transactionType: 'SELL',
        fillPrice: 7810,
        fillSize: 2,
        ssboe: at('2026-10-26T14:00:00Z'),
      }),
    ]
    const afterCloseChecks = computeOpeningPositionChecks({
      fills: closeInWindow,
      positions: [],
    })
    expect(afterCloseChecks[0]).toMatchObject({ pEnd: 0, net: -2, p0: 2 })
    const closed = buildTradesFromRithmicFills(
      closeInWindow,
      'u1',
      tickBySymbol,
      undefined,
      {
        openingSeeds: decideOpeningSeeds(
          afterCloseChecks,
          closeInWindow,
          WINDOW_START_MS,
        ).seeds,
      },
    )
    expect(closed.openSkipped).toBe(0)
    expect(closed.trades).toHaveLength(1)
    expect(closed.trades[0]?.pnl).toBe(0)
    expect(closed.trades[0]?.tags).toContain(RITHMIC_PROTOCOL_OPENING_SEED_TAG)
    expect(Number(closed.trades[0]?.entryPrice)).toBe(7810)
    expect(Number(closed.trades[0]?.closePrice)).toBe(7810)
  })

  it('snapshot-unavailable: no seeds, FIFO stays on current behavior', () => {
    const unseeded = buildTradesFromRithmicFills(jeremieFills, 'u1', tickBySymbol)
    expect(overnightShorts(unseeded.trades).length).toBeGreaterThan(0)
    expect(unseeded.openSkipped).toBe(2)
  })

  it('refuses OPENING_POSITION_UNKNOWN when P_0 is not an integer', () => {
    const checks = computeOpeningPositionChecks({
      fills: [
        fill({
          fillId: 'half',
          fillSize: 0.5,
          ssboe: at('2026-09-30T14:00:00Z'),
        }),
      ],
      positions: [],
    })
    expect(checks[0]?.p0).toBe(-0.5)
    expect(decideOpeningSeeds(checks, [], WINDOW_START_MS).error).toBe(
      'OPENING_POSITION_UNKNOWN',
    )
  })
})
