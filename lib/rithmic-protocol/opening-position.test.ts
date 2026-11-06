import { describe, expect, it } from 'vitest'
import { RITHMIC_PROTOCOL_OPENING_SEED_TAG } from '@/lib/trade-id-utils'
import { buildTradesFromRithmicFills } from './fills-to-trades'
import type { RithmicProtocolFill } from './types'
import {
  computeOpeningPositionChecks,
  decideOpeningSeeds,
  indexFillsByCanonicalId,
  isOpeningSeedOrderId,
  openingPositionKey,
  openingSeedOrderId,
  parseOpeningPositionKey,
  planOrdinarySyncTrades,
  reconcileBracketedSnapshots,
  retainOrdinarySyncRow,
  tradeClosedOnOrAfter,
  tradeTouchesSymbolKeys,
  uncertainOpeningSymbolKeys,
  utcYyyymmddStartMs,
} from './opening-position'

const ACCOUNT = 'LFE050-JEREMIE'
const tickBySymbol = new Map([['MES', { tickSize: 0.25, tickValue: 1.25 }]])
const at = (iso: string) => Date.parse(iso) / 1000
/** Friday 17:00 CT before the September fill fixtures. */
const WINDOW_START_MS = Date.parse('2026-09-25T22:00:00.000Z')
/** Later weekly close used for fill-less expiry / October close-in-window. */
const OCT_WEEKLY_CLOSE_MS = Date.parse('2026-10-23T22:00:00.000Z')

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
        unpricedCount: 0,
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
        unpricedCount: 0,
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
          OCT_WEEKLY_CLOSE_MS,
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
    expect(plan.stampLastSyncedAt).toBe(false)
    expect(plan.syncStatus).toBe('degraded')
    expect(plan.warnings.length).toBeGreaterThan(0)
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
    expect(plan.stampLastSyncedAt).toBe(true)
    expect(plan.syncStatus).toBe('ok')
  })

  it('flat user: complete empty snapshots leave unrelated trades writable and stamp lastSyncedAt', () => {
    const mnq = {
      accountNumber: ACCOUNT,
      entryId: 'mnq-open',
      closeId: 'mnq-close',
      closeDate: '2026-10-02T14:00:00.000Z',
    }
    const uncertain = uncertainOpeningSymbolKeys({
      incomingFills: [],
      before: { positions: [], complete: true },
      after: { positions: [], complete: true },
    })
    expect(uncertain.determined).toBe(true)
    expect(uncertain.keys.size).toBe(0)
    const plan = planOrdinarySyncTrades({
      trades: [mnq],
      fills: [],
      snapshotOk: false,
      skippedSymbolKeys: new Set(),
      uncertainSymbolKeys: uncertain.keys,
      openingStateDetermined: uncertain.determined,
    })
    expect(plan.persist).toEqual([mnq])
    expect(plan.skipPhantomDelete).toBe(false)
    expect(plan.stampLastSyncedAt).toBe(true)
    expect(plan.syncStatus).toBe('ok')
    expect(plan.warnings).toEqual([])
  })

  it('does not stamp lastSyncedAt when frozen symbols cannot be listed', () => {
    const plan = planOrdinarySyncTrades({
      trades: [
        {
          accountNumber: ACCOUNT,
          entryId: 'x',
          closeId: 'y',
          closeDate: '2026-10-02T14:00:00.000Z',
        },
      ],
      fills: jeremieFills,
      snapshotOk: false,
      skippedSymbolKeys: new Set(),
      openingStateDetermined: false,
    })
    expect(plan.persist).toEqual([])
    expect(plan.stampLastSyncedAt).toBe(false)
    expect(plan.syncStatus).toBe('degraded')
    expect(plan.skipPhantomDelete).toBe(true)
  })

  it('freezes only fill-window symbols when the snapshot is unavailable but determined', () => {
    const unseeded = buildTradesFromRithmicFills(jeremieFills, 'u1', tickBySymbol)
    const mnq = {
      accountNumber: ACCOUNT,
      entryId: 'mnq-open',
      closeId: 'mnq-close',
      closeDate: '2026-10-02T14:00:00.000Z',
    }
    const uncertain = uncertainOpeningSymbolKeys({
      incomingFills: jeremieFills,
      before: { positions: [], complete: true },
      after: { positions: [], complete: true },
    })
    expect(uncertain.keys.has(openingPositionKey(ACCOUNT, 'MESZ6'))).toBe(true)
    const plan = planOrdinarySyncTrades({
      trades: [...unseeded.trades, mnq],
      fills: jeremieFills,
      snapshotOk: false,
      skippedSymbolKeys: new Set(),
      uncertainSymbolKeys: uncertain.keys,
      openingStateDetermined: true,
    })
    expect(plan.persist).toEqual([mnq])
    expect(plan.stampLastSyncedAt).toBe(false)
    expect(plan.syncStatus).toBe('degraded')
    expect(plan.skipPhantomDelete).toBe(false)
    expect(plan.warnings.length).toBeGreaterThan(0)
  })
})

describe('uncertainOpeningSymbolKeys', () => {
  it('treats incomplete snapshots as undetermined even with an empty book', () => {
    const result = uncertainOpeningSymbolKeys({
      incomingFills: [],
      before: { positions: [], complete: false },
      after: { positions: [], complete: false },
    })
    expect(result.determined).toBe(false)
    expect(result.keys.size).toBe(0)
  })

  it('includes nonzero snapshot symbols even without fills', () => {
    const result = uncertainOpeningSymbolKeys({
      incomingFills: [],
      before: {
        positions: [{ accountId: ACCOUNT, symbol: 'MNQZ6', netQuantity: 1 }],
        complete: true,
      },
      after: { positions: [], complete: true },
    })
    expect(result.determined).toBe(true)
    expect(result.keys.has(openingPositionKey(ACCOUNT, 'MNQZ6'))).toBe(true)
  })
})

describe('reconcileBracketedSnapshots plant lag and clocks', () => {
  const capturedAtMs = Date.parse('2026-10-02T18:00:00.000Z')
  const flat = {
    positions: [] as { accountId: string; symbol: string; netQuantity: number }[],
    complete: true,
    capturedAtMs,
  }

  it('freezes when snapshot clocks are missing', () => {
    const result = reconcileBracketedSnapshots({
      before: { positions: [], complete: true },
      after: { positions: [], complete: true },
      fills: [],
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('snapshot_clock_missing')
  })

  it('freezes equal books when fills between the clocks have a nonzero net', () => {
    const beforeMs = Date.parse('2026-10-02T17:00:00.000Z')
    const afterMs = Date.parse('2026-10-02T18:00:00.000Z')
    const result = reconcileBracketedSnapshots({
      before: { ...flat, capturedAtMs: beforeMs },
      after: { ...flat, capturedAtMs: afterMs },
      fills: [
        fill({
          fillId: 'lag-buy',
          fillSize: 2,
          ssboe: (beforeMs + 30_000) / 1000,
        }),
      ],
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('fills_during_equal_snapshots')
  })

  it('freezes equal books when fills between the clocks net to zero', () => {
    const beforeMs = Date.parse('2026-10-02T17:00:00.000Z')
    const afterMs = Date.parse('2026-10-02T18:00:00.000Z')
    const result = reconcileBracketedSnapshots({
      before: { ...flat, capturedAtMs: beforeMs },
      after: { ...flat, capturedAtMs: afterMs },
      fills: [
        fill({
          fillId: 'lag-buy',
          fillSize: 1,
          ssboe: (beforeMs + 10_000) / 1000,
        }),
        fill({
          fillId: 'lag-sell',
          transactionType: 'SELL',
          fillSize: 1,
          ssboe: (beforeMs + 20_000) / 1000,
        }),
      ],
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('fills_during_equal_snapshots')
  })

  it('does not treat PnL no-data as flat when the account still has fills', () => {
    const result = reconcileBracketedSnapshots({
      before: { ...flat, noDataAccountIds: [ACCOUNT] },
      after: { ...flat, noDataAccountIds: [ACCOUNT] },
      fills: roundTrip,
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('pnl_no_data')
  })

  it('flat user: no-data with no fills still accepts the empty book', () => {
    const result = reconcileBracketedSnapshots({
      before: { ...flat, noDataAccountIds: [ACCOUNT] },
      after: { ...flat, noDataAccountIds: [ACCOUNT] },
      fills: [],
    })
    expect(result).toEqual({ ok: true, positions: [] })
  })
})

describe('planOrdinarySyncTrades fill-history completeness', () => {
  it('freezes instead of seeding when ShowFillHistory was incomplete', () => {
    const plan = planOrdinarySyncTrades({
      trades: [
        {
          accountNumber: ACCOUNT,
          entryId: 'x',
          closeId: 'y',
          closeDate: '2026-10-02T14:00:00.000Z',
        },
      ],
      fills: jeremieFills,
      snapshotOk: true,
      skippedSymbolKeys: new Set(),
      fillHistoryComplete: false,
    })
    expect(plan.persist).toEqual([])
    expect(plan.skipPhantomDelete).toBe(true)
    expect(plan.stampLastSyncedAt).toBe(false)
    expect(plan.syncStatus).toBe('degraded')
    expect(plan.dropReasons.incomplete_fill_history_trades_skipped).toBe(1)
  })
})

describe('retainOrdinarySyncRow pre-history / rolling cutoff', () => {
  it('keeps trades closed before the rolling history start', () => {
    const historyStartMs = utcYyyymmddStartMs('20261001')
    const old = {
      accountNumber: ACCOUNT,
      entryId: 'old-open',
      closeId: 'old-close',
      closeDate: '2026-09-15T14:00:00.000Z',
    }
    expect(
      retainOrdinarySyncRow(old, {
        freezeKeys: new Set(),
        fills: [],
        historyStartMs,
      }),
    ).toBe(true)
    expect(tradeClosedOnOrAfter(old, historyStartMs)).toBe(false)
  })

  it('does not keep in-window unmatched rows', () => {
    expect(
      retainOrdinarySyncRow(
        {
          accountNumber: ACCOUNT,
          entryId: 'new-open',
          closeId: 'new-close',
          closeDate: '2026-10-02T14:00:00.000Z',
        },
        {
          freezeKeys: new Set(),
          fills: [],
          historyStartMs: utcYyyymmddStartMs('20261001'),
        },
      ),
    ).toBe(false)
  })
})

describe('computeOpeningPositionChecks window filter and unpriced fills', () => {
  it('does not seed leftover historical net after a fill-less expiry', () => {
    const expired = [
      fill({
        fillId: 'old-sell',
        transactionType: 'SELL',
        fillSize: 2,
        ssboe: at('2026-09-01T14:00:00Z'),
      }),
    ]
    const weekend = OCT_WEEKLY_CLOSE_MS
    const checks = computeOpeningPositionChecks({
      fills: expired,
      positions: [],
      sinceMs: weekend,
    })
    expect(checks).toEqual([])
    expect(decideOpeningSeeds(checks, expired, weekend).seeds).toEqual([])
  })

  it('does not let leftover history inflate window gross and seed an inverted lot', () => {
    const leftover = [
      fill({
        fillId: 'old-sell',
        transactionType: 'SELL',
        fillSize: 2,
        ssboe: at('2026-09-01T14:00:00Z'),
      }),
    ]
    const weekend = OCT_WEEKLY_CLOSE_MS
    const checks = computeOpeningPositionChecks({
      fills: leftover,
      positions: [],
    })
    expect(checks[0]?.p0).toBe(2)
    const decision = decideOpeningSeeds(checks, leftover, weekend)
    expect(decision.seeds).toEqual([])
    expect(decision.skipped[0]?.reason).toBe('p0_exceeds_window_gross')
  })

  it('skips unpriced fills in P_0 arithmetic and refuses to seed', () => {
    const unpriced = [
      fill({
        fillId: 'no-px',
        fillPrice: 0,
        fillSize: 2,
        ssboe: at('2026-09-30T14:00:00Z'),
      }),
    ]
    const checks = computeOpeningPositionChecks({
      fills: unpriced,
      positions: [{ accountId: ACCOUNT, symbol: 'MESZ6', netQuantity: 2 }],
    })
    expect(checks[0]?.net).toBe(0)
    expect(checks[0]?.p0).toBe(2)
    expect(checks[0]?.unpricedCount).toBe(1)
    const decision = decideOpeningSeeds(checks, unpriced, WINDOW_START_MS)
    expect(decision.seeds).toEqual([])
    expect(decision.skipped[0]?.reason).toBe('unpriced_fills')
  })
})

describe('openingPositionKey encoding', () => {
  it('round-trips account ids that contain the delimiter', () => {
    const accountId = 'FIRM|DESK-1'
    const key = openingPositionKey(accountId, 'MESZ6')
    expect(parseOpeningPositionKey(key)).toEqual({
      accountId,
      symbol: 'MESZ6',
    })
  })
})

describe('indexFillsByCanonicalId raw and canonical ids', () => {
  it('looks up Replay basketId_fillId and the bare history id', () => {
    const replay = fill({
      fillId: '239200544_1319858',
      ssboe: at('2026-09-30T14:00:00Z'),
    })
    const byId = indexFillsByCanonicalId([replay])
    expect(byId.get('239200544_1319858')).toBe(replay)
    expect(byId.get('1319858')).toBe(replay)
    expect(
      tradeTouchesSymbolKeys(
        { entryId: '239200544_1319858', closeId: 'x' },
        new Set([openingPositionKey(ACCOUNT, 'MESZ6')]),
        byId,
      ),
    ).toBe(true)
  })
})
