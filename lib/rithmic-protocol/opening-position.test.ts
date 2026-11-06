import { describe, expect, it } from 'vitest'
import { RITHMIC_PROTOCOL_OPENING_SEED_TAG } from '@/lib/trade-id-utils'
import { buildTradesFromRithmicFills } from './fills-to-trades'
import type { RithmicProtocolFill } from './types'
import {
  computeOpeningPositionChecks,
  decideOpeningSeeds,
  isOpeningSeedOrderId,
  openingPositionKey,
  openingSeedOrderId,
  planOrdinarySyncTrades,
  reconcileBracketedSnapshots,
  tradeClosedOnOrAfter,
  utcYyyymmddStartMs,
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

  it('weekend-hold with no fills: |P_0| > gross, skip rather than seed', () => {
    const held: RithmicProtocolFill[] = []
    const checks = computeOpeningPositionChecks({
      fills: held,
      positions: [{ accountId: ACCOUNT, symbol: 'MESZ6', netQuantity: 2 }],
    })
    expect(checks[0]).toMatchObject({ pEnd: 2, net: 0, p0: 2, fillCount: 0 })
    const decision = decideOpeningSeeds(checks, held, WINDOW_START_MS)
    expect(decision.seeds).toEqual([])
    expect(decision.error).toBeUndefined()
    expect(decision.skipped).toEqual([
      {
        accountId: ACCOUNT,
        symbol: 'MESZ6',
        reason: 'p0_exceeds_window_gross',
      },
    ])
    const open = buildTradesFromRithmicFills(held, 'u1', tickBySymbol, undefined, {
      openingSeeds: decision.seeds,
    })
    expect(open.trades).toEqual([])
    expect(open.openSkipped).toBe(0)
  })

  it('weekend-hold then closes in-window: seed and attribute 0 PnL', () => {
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

  it('snapshot-unavailable: ordinary sync keeps existing rather than FIFO-starting flat', () => {
    const unseeded = buildTradesFromRithmicFills(jeremieFills, 'u1', tickBySymbol)
    expect(overnightShorts(unseeded.trades).length).toBeGreaterThan(0)
    const plan = planOrdinarySyncTrades({
      trades: unseeded.trades,
      fills: jeremieFills,
      snapshotOk: false,
      skippedSymbolKeys: new Set(),
    })
    expect(plan.persist).toEqual([])
    expect(plan.skipPhantomDelete).toBe(true)
    expect(plan.dropReasons.snapshot_unavailable_trades_skipped).toBe(
      unseeded.trades.length,
    )
  })

  it('skips seeding when |P_0| exceeds window gross', () => {
    const leftoverBuy = [
      fill({
        fillId: 'open-1',
        fillSize: 1,
        ssboe: at('2026-09-30T14:00:00Z'),
      }),
    ]
    const checks = computeOpeningPositionChecks({
      fills: leftoverBuy,
      positions: [],
    })
    expect(checks[0]).toMatchObject({ pEnd: 0, net: 1, p0: -1, fillCount: 1 })
    const oversized = [{ ...checks[0]!, p0: -5 }]
    const decision = decideOpeningSeeds(oversized, leftoverBuy, WINDOW_START_MS)
    expect(decision.seeds).toEqual([])
    expect(decision.error).toBe('OPENING_POSITION_UNKNOWN')
    expect(decision.skipped[0]?.reason).toBe('p0_exceeds_window_gross')
  })

  it('refuses OPENING_POSITION_UNKNOWN when P_0 is not an integer', () => {
    const half = [
      fill({
        fillId: 'half',
        fillSize: 0.5,
        ssboe: at('2026-09-30T14:00:00Z'),
      }),
    ]
    const checks = computeOpeningPositionChecks({
      fills: half,
      positions: [],
    })
    expect(checks[0]?.p0).toBe(-0.5)
    const decision = decideOpeningSeeds(checks, half, WINDOW_START_MS)
    expect(decision.error).toBe('OPENING_POSITION_UNKNOWN')
    expect(decision.skipped[0]?.reason).toBe('non_integer_p0')
  })
})

describe('reconcileBracketedSnapshots', () => {
  const capturedAtMs = Date.parse('2026-10-02T18:00:00.000Z')
  const flat = {
    positions: [] as { accountId: string; symbol: string; netQuantity: number }[],
    complete: true,
    capturedAtMs,
  }

  it('accepts matching before/after books when fills predate the after snapshot', () => {
    const result = reconcileBracketedSnapshots({
      before: flat,
      after: flat,
      fills: roundTrip,
    })
    expect(result).toEqual({ ok: true, positions: [] })
  })

  it('treats a position-map mismatch as unavailable', () => {
    const result = reconcileBracketedSnapshots({
      before: {
        ...flat,
        positions: [{ accountId: ACCOUNT, symbol: 'MESZ6', netQuantity: 2 }],
      },
      after: flat,
      fills: roundTrip,
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('snapshot_mismatch')
  })

  it('treats a fill timestamp after the after-snapshot as unavailable', () => {
    const result = reconcileBracketedSnapshots({
      before: flat,
      after: flat,
      fills: [
        fill({
          fillId: 'late',
          ssboe: capturedAtMs / 1000 + 1,
        }),
      ],
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('fill_after_snapshot')
  })

  it('treats an incomplete before snapshot as unavailable', () => {
    const result = reconcileBracketedSnapshots({
      before: { ...flat, complete: false, reason: 'timeout' },
      after: flat,
      fills: roundTrip,
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('timeout')
  })
})

describe('planOrdinarySyncTrades', () => {
  it('does not persist trades closed before historyStartDate', () => {
    const seeded = buildTradesFromRithmicFills(
      jeremieFills,
      'u1',
      tickBySymbol,
      undefined,
      {
        openingSeeds: decideOpeningSeeds(
          computeOpeningPositionChecks({
            fills: jeremieFills,
            positions: [],
          }),
          jeremieFills,
          WINDOW_START_MS,
        ).seeds,
      },
    )
    const historyStartMs = utcYyyymmddStartMs('20261001')
    expect(historyStartMs).toBe(Date.UTC(2026, 9, 1))
    const plan = planOrdinarySyncTrades({
      trades: seeded.trades,
      fills: jeremieFills,
      snapshotOk: true,
      skippedSymbolKeys: new Set(),
      historyStartMs,
    })
    expect(
      plan.persist.every((trade) => tradeClosedOnOrAfter(trade, historyStartMs)),
    ).toBe(true)
    expect(plan.dropReasons.closed_before_history_start).toBeGreaterThan(0)
    expect(plan.derivedForPhantoms.length).toBe(seeded.trades.length)
    expect(plan.skipPhantomDelete).toBe(false)
  })

  it('skips FIFO writes for symbols that could not be seeded', () => {
    const seeded = buildTradesFromRithmicFills(
      jeremieFills,
      'u1',
      tickBySymbol,
      undefined,
      {
        openingSeeds: decideOpeningSeeds(
          computeOpeningPositionChecks({
            fills: jeremieFills,
            positions: [],
          }),
          jeremieFills,
          WINDOW_START_MS,
        ).seeds,
      },
    )
    const plan = planOrdinarySyncTrades({
      trades: seeded.trades,
      fills: jeremieFills,
      snapshotOk: true,
      skippedSymbolKeys: new Set([openingPositionKey(ACCOUNT, 'MESZ6')]),
    })
    expect(plan.persist).toEqual([])
    expect(plan.derivedForPhantoms).toEqual([])
    expect(plan.dropReasons.opening_snapshot_symbol_skipped).toBe(
      seeded.trades.length,
    )
  })
})
