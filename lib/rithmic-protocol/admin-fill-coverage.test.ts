import { describe, expect, it } from 'vitest'
import {
  coverageIncludesYmd,
  fifoTieChangesOutcome,
  fillsInOrdinaryFetchRange,
  lastFlatPointBefore,
  lastFlatYmdBeforeAnchor,
  skippedOrdinaryRangeIsQuiet,
  inWindowDerivedTrades,
  isFillHistoryControlRow,
  knownFillSide,
  ordinarySyncTradesMatchRebuild,
  observeMappedFillRow,
  protocolTradeCoveredByRawFills,
  residualOpenLots,
  residualOpenLotsMatch,
  storedFillsMissingUpstream,
  uncoveredTradesByFillIdentity,
  unstoredPreAnchorFills,
  coverageReachesAnchor,
  windowResolvedAfterFallback,
} from './admin-fill-coverage'
import { deriveTradesFromFillLedger, prepareRithmicProtocolFills } from './fill-ledger'
import { buildTradesFromRithmicFills } from './fills-to-trades'
import type { RithmicProtocolFill } from './types'

const ACCOUNT = 'LFE050'
const TICK = new Map([['MES', { tickSize: 0.25, tickValue: 1.25 }]])

function fill(params: Partial<RithmicProtocolFill> & { fillId: string }): RithmicProtocolFill {
  return {
    accountId: ACCOUNT,
    symbol: 'MESZ6',
    transactionType: 'BUY',
    fillPrice: 5800,
    fillSize: 1,
    fillDate: '20261020',
    ssboe: Date.parse('2026-10-20T14:00:00Z') / 1000,
    source: 'history',
    ...params,
  }
}

describe('observeMappedFillRow', () => {
  it('flags a symbol with no price as missing_price', () => {
    expect(
      observeMappedFillRow({ symbol: 'MESZ6', fillSize: 1 }, false),
    ).toEqual({ accepted: false, reason: 'missing_price' })
  })

  it('flags an unknown side on an otherwise accepted row', () => {
    expect(
      observeMappedFillRow(
        { symbol: 'MESZ6', fillPrice: 1, fillSize: 1, transactionType: 'HOLD' },
        true,
      ),
    ).toEqual({ accepted: false, reason: 'unknown_side' })
  })

  it('ignores terminator and rp_code 7 messages with no fill fields (N1)', () => {
    expect(
      isFillHistoryControlRow({ rpCode: ['0'] }),
    ).toBe(true)
    expect(
      observeMappedFillRow({ rpCode: ['7'] }, false),
    ).toEqual({ accepted: true })
    expect(
      observeMappedFillRow({ rpCode: ['0'] }, false),
    ).toEqual({ accepted: true })
  })

  it('accepts exchange SS enum 3 as a sell (N20)', () => {
    expect(knownFillSide('3')).toBe('S')
    expect(
      observeMappedFillRow(
        { symbol: 'MESZ6', fillPrice: 1, fillSize: 1, transactionType: 3 },
        true,
      ),
    ).toEqual({ accepted: true })
  })
})

describe('stored fill and trade coverage identity', () => {
  it('does not treat a recycled fill id on a later day as coverage (M1)', () => {
    const stored = fill({
      fillId: '1001',
      fillDate: '20261006',
      ssboe: Date.parse('2026-10-06T14:00:00Z') / 1000,
    })
    const upstream = fill({
      fillId: '1001',
      fillDate: '20261020',
      ssboe: Date.parse('2026-10-20T14:00:00Z') / 1000,
    })
    expect(storedFillsMissingUpstream([stored], [upstream])).toEqual([stored])
    expect(
      protocolTradeCoveredByRawFills(
        {
          accountNumber: ACCOUNT,
          instrument: 'MES',
          entryId: '1001',
          closeId: '1002',
          entryDate: '2026-10-06T14:00:00.000Z',
          closeDate: '2026-10-06T14:05:00.000Z',
        },
        [upstream, fill({ fillId: '1002', fillDate: '20261020' })],
      ),
    ).toBe(false)
  })

  it('covers a legacy split-piece id from a history rollup (M6)', () => {
    const storedTrade = {
      accountNumber: ACCOUNT,
      instrument: 'MES',
      side: 'Long',
      quantity: 1,
      entryPrice: 5800,
      closePrice: 5800,
      entryId: '1245660',
      closeId: '1245669',
      entryDate: '2026-10-20T14:00:00.000Z',
      closeDate: '2026-10-20T14:00:01.000Z',
    }
    const rollup = fill({
      fillId: '1245663',
      fillSize: 5,
      ssboe: Date.parse('2026-10-20T14:00:00Z') / 1000,
    })
    const close = fill({
      fillId: '1245669',
      transactionType: 'SELL',
      ssboe: Date.parse('2026-10-20T14:00:01Z') / 1000,
    })
    expect(protocolTradeCoveredByRawFills(storedTrade, [rollup, close])).toBe(true)
    expect(
      storedFillsMissingUpstream(
        [fill({ fillId: '1245660', fillSize: 1, ssboe: Date.parse('2026-10-20T14:00:00Z') / 1000 })],
        [rollup],
      ),
    ).toEqual([])
  })

  it('does not add Replay pieces and a history rollup of the same Lucid execution (F7)', () => {
    const ssboe = Date.parse('2026-10-20T14:00:00Z') / 1000
    const replayA = fill({
      fillId: '1163440',
      fillSize: 2,
      source: 'replay',
      ssboe,
    })
    const replayB = fill({
      fillId: '1163441',
      fillSize: 3,
      source: 'replay',
      ssboe: ssboe + 1,
    })
    const history = fill({
      fillId: '1163441',
      fillSize: 5,
      source: 'history',
      ssboe,
    })
    expect(
      storedFillsMissingUpstream([replayA, replayB, history], [history]),
    ).toEqual([])
    expect(storedFillsMissingUpstream([replayA, replayB], [history])).toEqual([])
    expect(
      storedFillsMissingUpstream([replayA, replayB, history], [replayA, replayB, history]),
    ).toEqual([])
    expect(
      storedFillsMissingUpstream(
        [
          fill({
            fillId: '1163440',
            fillSize: 2,
            source: 'replay',
            ssboe,
          }),
          fill({
            fillId: '1163441',
            fillSize: 3,
            source: 'replay',
            ssboe: ssboe + 5,
          }),
        ],
        [history],
      ),
    ).toEqual([])
  })

  it('covers a consolidated stored trade with summed upstream split pieces', () => {
    const ssboe = Date.parse('2026-10-20T14:00:00Z') / 1000
    const storedTrade = {
      accountNumber: ACCOUNT,
      instrument: 'MES',
      side: 'Long',
      quantity: 5,
      entryPrice: 5800,
      closePrice: 5801,
      entryId: '1163441',
      closeId: '1163450',
      entryDate: '2026-10-20T14:00:00.000Z',
      closeDate: '2026-10-20T14:00:02.000Z',
    }
    const pieces = [
      fill({ fillId: '1163440', fillSize: 2, ssboe }),
      fill({ fillId: '1163441', fillSize: 3, ssboe: ssboe + 1 }),
      fill({
        fillId: '1163450',
        transactionType: 'SELL',
        fillSize: 5,
        fillPrice: 5801,
        ssboe: ssboe + 2,
      }),
    ]
    expect(protocolTradeCoveredByRawFills(storedTrade, pieces)).toBe(true)
    expect(uncoveredTradesByFillIdentity([storedTrade], pieces)).toEqual([])
    expect(
      protocolTradeCoveredByRawFills(storedTrade, [
        fill({ fillId: '1163440', fillSize: 2, ssboe }),
        fill({
          fillId: '1163450',
          transactionType: 'SELL',
          fillSize: 5,
          fillPrice: 5801,
          ssboe: ssboe + 2,
        }),
      ]),
    ).toBe(false)
  })

  it('uncoveredTradesByFillIdentity uses raw fills, not consolidated ids', () => {
    const existing = [
      {
        id: 't1',
        accountNumber: ACCOUNT,
        instrument: 'MES',
        entryId: '1245660',
        closeId: '1245669',
        entryDate: '2026-10-20T14:00:00.000Z',
        closeDate: '2026-10-20T14:00:01.000Z',
        side: 'Long',
        quantity: 1,
        entryPrice: 5800,
        closePrice: 5800,
      },
    ]
    expect(
      uncoveredTradesByFillIdentity(existing, [
        fill({ fillId: '1245663', fillSize: 5, ssboe: Date.parse('2026-10-20T14:00:00Z') / 1000 }),
        fill({
          fillId: '1245669',
          transactionType: 'SELL',
          ssboe: Date.parse('2026-10-20T14:00:01Z') / 1000,
        }),
      ]),
    ).toEqual([])
  })
})

describe('windowResolvedAfterFallback', () => {
  it('treats rp_code 7 as unresolved until order-history succeeds', () => {
    expect(
      windowResolvedAfterFallback({
        historyStatus: 'no_data',
        historyFillCount: 0,
        fallbackStatus: 'skipped',
        fallbackFillCount: 0,
      }),
    ).toEqual({ resolved: false, source: 'unresolved' })
    expect(
      windowResolvedAfterFallback({
        historyStatus: 'no_data',
        historyFillCount: 0,
        fallbackStatus: 'ok',
        fallbackFillCount: 0,
      }),
    ).toEqual({ resolved: false, source: 'unresolved' })
    expect(
      windowResolvedAfterFallback({
        historyStatus: 'no_data',
        historyFillCount: 0,
        fallbackStatus: 'ok',
        fallbackFillCount: 0,
        fallbackDates: ['20261030'],
        startYmd: '2026-10-30',
        endYmd: '2026-11-08',
      }),
    ).toEqual({ resolved: true, source: 'order_history' })
    expect(
      windowResolvedAfterFallback({
        historyStatus: 'no_data',
        historyFillCount: 0,
        fallbackStatus: 'ok',
        fallbackFillCount: 1,
        fallbackDates: ['20261020'],
        fallbackFillDays: ['20261020'],
        startYmd: '2026-10-09',
        endYmd: '2026-11-07',
      }),
    ).toEqual({ resolved: false, source: 'unresolved' })
    expect(
      windowResolvedAfterFallback({
        historyStatus: 'no_data',
        historyFillCount: 0,
        fallbackStatus: 'ok',
        fallbackFillCount: 0,
        fallbackDates: ['20261009', '20261107'],
        startYmd: '2026-10-09',
        endYmd: '2026-11-07',
      }),
    ).toEqual({ resolved: true, source: 'order_history' })
    expect(
      windowResolvedAfterFallback({
        historyStatus: 'no_data',
        historyFillCount: 0,
        fallbackStatus: 'skipped',
        fallbackFillCount: 0,
        startYmd: '2026-11-08',
        endYmd: '2026-11-08',
        todayYmd: '2026-11-07',
      }),
    ).toEqual({ resolved: true, source: 'history' })
    expect(
      windowResolvedAfterFallback({
        historyStatus: 'ok',
        historyFillCount: 0,
        fallbackStatus: 'skipped',
        fallbackFillCount: 0,
      }),
    ).toEqual({ resolved: true, source: 'history' })
    expect(
      windowResolvedAfterFallback({
        historyStatus: 'no_data',
        historyFillCount: 0,
        fallbackStatus: 'ok',
        fallbackFillCount: 0,
        fallbackDates: ['20261020'],
        startYmd: '2026-09-01',
        endYmd: '2026-09-30',
      }),
    ).toEqual({ resolved: true, source: 'history' })
    expect(
      windowResolvedAfterFallback({
        historyStatus: 'no_data',
        historyFillCount: 0,
        fallbackStatus: 'ok',
        fallbackFillCount: 0,
        fallbackDates: ['20261020'],
        occupiedFillDays: ['20260915'],
        startYmd: '2026-09-01',
        endYmd: '2026-09-30',
      }),
    ).toEqual({ resolved: false, source: 'unresolved' })
    expect(
      windowResolvedAfterFallback({
        historyStatus: 'no_data',
        historyFillCount: 0,
        fallbackStatus: 'ok',
        fallbackFillCount: 0,
        fallbackDates: ['20261102'],
        startYmd: '2026-10-31',
        endYmd: '2026-11-02',
      }),
    ).toEqual({ resolved: true, source: 'order_history' })
    expect(
      windowResolvedAfterFallback({
        historyStatus: 'no_data',
        historyFillCount: 0,
        fallbackStatus: 'failed',
        fallbackFillCount: 0,
        fallbackDates: [],
        occupiedFillDays: ['20261020'],
        startYmd: '2026-09-01',
        endYmd: '2026-09-30',
      }),
    ).toEqual({ resolved: false, source: 'unresolved' })
    expect(
      windowResolvedAfterFallback({
        historyStatus: 'no_data',
        historyFillCount: 0,
        fallbackStatus: 'skipped',
        fallbackFillCount: 0,
        occupiedFillDays: ['20261020'],
        startYmd: '2026-09-01',
        endYmd: '2026-09-30',
      }),
    ).toEqual({ resolved: false, source: 'unresolved' })
  })

  it('does not treat a prefix as quiet when stored fills started earlier (A1)', () => {
    expect(
      windowResolvedAfterFallback({
        historyStatus: 'no_data',
        historyFillCount: 0,
        fallbackStatus: 'ok',
        fallbackFillCount: 0,
        fallbackDates: ['20261020'],
        occupiedFillDays: ['20260801'],
        startYmd: '2026-09-01',
        endYmd: '2026-09-30',
      }),
    ).toEqual({ resolved: false, source: 'unresolved' })
  })

  it('does not treat a middle window as quiet when another window already had fills (A1)', () => {
    expect(
      windowResolvedAfterFallback({
        historyStatus: 'no_data',
        historyFillCount: 0,
        fallbackStatus: 'ok',
        fallbackFillCount: 0,
        fallbackDates: ['20261101'],
        fallbackFillDays: [],
        allFillDays: ['20260915'],
        startYmd: '2026-10-01',
        endYmd: '2026-10-31',
      }),
    ).toEqual({ resolved: false, source: 'unresolved' })
  })

  it('still treats a true prefix as quiet when other-window fills are after it (A1)', () => {
    expect(
      windowResolvedAfterFallback({
        historyStatus: 'no_data',
        historyFillCount: 0,
        fallbackStatus: 'ok',
        fallbackFillCount: 0,
        fallbackDates: ['20261020'],
        fallbackFillDays: [],
        allFillDays: ['20261020'],
        occupiedFillDays: ['20261020'],
        startYmd: '2026-09-01',
        endYmd: '2026-09-30',
      }),
    ).toEqual({ resolved: true, source: 'history' })
  })

  it('requires the first resolved window to start at the anchor date (N3)', () => {
    expect(
      coverageReachesAnchor({
        coverage: [
          {
            startYmd: '2026-10-30',
            endYmd: '2026-11-08',
            historyFillCount: 0,
            historyStatus: 'ok',
            fallbackFillCount: 0,
            fallbackStatus: 'skipped',
            fallbackDates: [],
            resolved: true,
            source: 'history',
          },
        ],
        historyStartYmd: '2026-10-30',
      }),
    ).toBe(true)
    expect(
      coverageReachesAnchor({
        coverage: [
          {
            startYmd: '2026-11-02',
            endYmd: '2026-11-08',
            historyFillCount: 1,
            historyStatus: 'ok',
            fallbackFillCount: 0,
            fallbackStatus: 'skipped',
            fallbackDates: [],
            resolved: true,
            source: 'history',
          },
        ],
        historyStartYmd: '2026-10-30',
      }),
    ).toBe(false)
  })
})

describe('evening-session and split identity', () => {
  it('covers an evening UTC day that disagrees with fill_date (N5)', () => {
    expect(
      protocolTradeCoveredByRawFills(
        {
          accountNumber: ACCOUNT,
          instrument: 'MES',
          side: 'Long',
          quantity: 1,
          entryPrice: 5800,
          closePrice: 5801,
          entryId: 'e1',
          closeId: 'e2',
          entryDate: '2026-11-02T23:30:00.000Z',
          closeDate: '2026-11-02T23:31:00.000Z',
        },
        [
          fill({
            fillId: 'e1',
            fillDate: '20261103',
            ssboe: Date.parse('2026-11-02T23:30:00Z') / 1000,
          }),
          fill({
            fillId: 'e2',
            transactionType: 'SELL',
            fillPrice: 5801,
            fillDate: '20261103',
            ssboe: Date.parse('2026-11-02T23:31:00Z') / 1000,
          }),
        ],
      ),
    ).toBe(true)
  })

  it('does not cover a split piece with the wrong side or price (N6)', () => {
    expect(
      protocolTradeCoveredByRawFills(
        {
          accountNumber: ACCOUNT,
          instrument: 'MES',
          side: 'Long',
          quantity: 1,
          entryPrice: 5800,
          closePrice: 5805,
          entryId: '1001',
          closeId: '1002',
          entryDate: '2026-10-20T14:00:00.000Z',
          closeDate: '2026-10-20T14:00:01.000Z',
        },
        [
          fill({
            fillId: '1003',
            transactionType: 'SELL',
            fillPrice: 5801,
            ssboe: Date.parse('2026-10-20T14:00:00Z') / 1000,
          }),
          fill({
            fillId: '1004',
            fillPrice: 5799,
            ssboe: Date.parse('2026-10-20T14:00:01Z') / 1000,
          }),
        ],
      ),
    ).toBe(false)
  })

  it('lists unstored pre-anchor fills regardless of ordinary range (helper only)', () => {
    const friday = fill({
      fillId: 's1',
      transactionType: 'SELL',
      ssboe: Date.parse('2026-10-30T15:00:00Z') / 1000,
      fillDate: '20261030',
    })
    const monday = fill({
      fillId: 'b3',
      ssboe: Date.parse('2026-11-02T15:00:00Z') / 1000,
      fillDate: '20261102',
    })
    expect(
      unstoredPreAnchorFills(
        [friday, monday],
        [],
        Date.parse('2026-10-30T22:00:00Z'),
      ).map((row) => row.fillId),
    ).toEqual(['s1'])
  })

  it('compares residual open lots by identity (N8)', () => {
    const open = [
      fill({ fillId: 'b0', ssboe: Date.parse('2026-10-29T15:00:00Z') / 1000 }),
      fill({ fillId: 'b1', ssboe: Date.parse('2026-11-02T15:00:00Z') / 1000 }),
    ]
    const windowOnly = [
      fill({ fillId: 'b1', ssboe: Date.parse('2026-11-02T15:00:00Z') / 1000 }),
    ]
    expect(
      residualOpenLotsMatch(residualOpenLots(open), residualOpenLots(windowOnly)),
    ).toBe(false)
  })
})

describe('ordinary sync vs rebuild fingerprints', () => {
  it('a following ordinary sync on window-only fills matches the rebuild and has no phantom shorts (H1)', () => {
    const monday = [
      fill({
        fillId: 'b3',
        ssboe: Date.parse('2026-11-02T15:00:00Z') / 1000,
        fillDate: '20261102',
      }),
      fill({
        fillId: 's3',
        transactionType: 'SELL',
        fillPrice: 5801,
        ssboe: Date.parse('2026-11-02T15:00:05Z') / 1000,
        fillDate: '20261102',
      }),
      fill({
        fillId: 'b4',
        ssboe: Date.parse('2026-11-02T15:00:10Z') / 1000,
        fillDate: '20261102',
      }),
      fill({
        fillId: 's4',
        transactionType: 'SELL',
        fillPrice: 5801,
        ssboe: Date.parse('2026-11-02T15:00:15Z') / 1000,
        fillDate: '20261102',
      }),
    ]
    const fridayPrefix = [
      fill({
        fillId: 's1',
        transactionType: 'SELL',
        ssboe: Date.parse('2026-10-30T15:00:00Z') / 1000,
        fillDate: '20261030',
      }),
      fill({
        fillId: 's2',
        transactionType: 'SELL',
        ssboe: Date.parse('2026-10-30T15:05:00Z') / 1000,
        fillDate: '20261030',
      }),
    ]
    const rebuild = buildTradesFromRithmicFills(
      prepareRithmicProtocolFills(monday).fills,
      'user-1',
      TICK,
    )
    expect(rebuild.trades.every((trade) => trade.side === 'Long')).toBe(true)
    expect(rebuild.trades.some((trade) => trade.side === 'Short')).toBe(false)

    const nextSync = deriveTradesFromFillLedger(monday, [])
    const ordinary = buildTradesFromRithmicFills(nextSync.fills, 'user-1', TICK)
    expect(
      ordinarySyncTradesMatchRebuild(
        inWindowDerivedTrades(ordinary.trades, Date.parse('2026-10-30T22:00:00Z')),
        rebuild.trades,
      ),
    ).toBe(true)
    expect(ordinary.trades.some((trade) => trade.side === 'Short')).toBe(false)

    const polluted = deriveTradesFromFillLedger([...fridayPrefix, ...monday], [])
    const undone = buildTradesFromRithmicFills(polluted.fills, 'user-1', TICK)
    expect(undone.trades.some((trade) => trade.side === 'Short')).toBe(true)
  })
})

describe('split-piece quantity consumption (W3)', () => {
  it('does not let one upstream fill cover two stored trades', () => {
    const upstream = [
      fill({ fillId: '1003', fillSize: 1, fillPrice: 5800 }),
      fill({
        fillId: '1007',
        transactionType: 'SELL',
        fillSize: 1,
        fillPrice: 5802,
        ssboe: Date.parse('2026-10-20T14:00:05Z') / 1000,
      }),
    ]
    const trades = [
      {
        accountNumber: ACCOUNT,
        instrument: 'MES',
        side: 'Long',
        quantity: 1,
        entryPrice: 5800,
        closePrice: 5802,
        entryId: '1001',
        closeId: '1005',
        entryDate: '2026-10-20T14:00:00.000Z',
        closeDate: '2026-10-20T14:00:05.000Z',
      },
      {
        accountNumber: ACCOUNT,
        instrument: 'MES',
        side: 'Long',
        quantity: 1,
        entryPrice: 5800,
        closePrice: 5802,
        entryId: '1003',
        closeId: '1007',
        entryDate: '2026-10-20T14:00:00.000Z',
        closeDate: '2026-10-20T14:00:05.000Z',
      },
    ]
    expect(uncoveredTradesByFillIdentity(trades, upstream)).toHaveLength(1)
  })

  it('allocates one upstream fill across scale-out stored trades by qty (B1)', () => {
    const ssboe = Date.parse('2026-10-20T14:00:00Z') / 1000
    const closeSsboe = ssboe + 2
    const trades = [
      {
        accountNumber: ACCOUNT,
        instrument: 'MES',
        side: 'Long',
        quantity: 2,
        entryPrice: 5800,
        closePrice: 5801,
        entryId: '1163441',
        closeId: '1163450',
        entryDate: '2026-10-20T14:00:00.000Z',
        closeDate: '2026-10-20T14:00:02.000Z',
      },
      {
        accountNumber: ACCOUNT,
        instrument: 'MES',
        side: 'Long',
        quantity: 3,
        entryPrice: 5800,
        closePrice: 5801,
        entryId: '1163441',
        closeId: '1163450',
        entryDate: '2026-10-20T14:00:00.000Z',
        closeDate: '2026-10-20T14:00:02.000Z',
      },
    ]
    const upstream = [
      fill({ fillId: '1163441', fillSize: 5, ssboe }),
      fill({
        fillId: '1163450',
        transactionType: 'SELL',
        fillSize: 5,
        fillPrice: 5801,
        ssboe: closeSsboe,
      }),
    ]
    expect(uncoveredTradesByFillIdentity(trades, upstream)).toEqual([])
  })

  it('allocates split pieces across scale-in stored trades that share the rollup id (B1)', () => {
    const ssboe = Date.parse('2026-10-20T14:00:00Z') / 1000
    const closeSsboe = ssboe + 2
    const trades = [
      {
        accountNumber: ACCOUNT,
        instrument: 'MES',
        side: 'Long',
        quantity: 3,
        entryPrice: 5800,
        closePrice: 5801,
        entryId: '1163441',
        closeId: '1163450',
        entryDate: '2026-10-20T14:00:00.000Z',
        closeDate: '2026-10-20T14:00:02.000Z',
      },
      {
        accountNumber: ACCOUNT,
        instrument: 'MES',
        side: 'Long',
        quantity: 2,
        entryPrice: 5800,
        closePrice: 5801,
        entryId: '1163441',
        closeId: '1163450',
        entryDate: '2026-10-20T14:00:00.000Z',
        closeDate: '2026-10-20T14:00:02.000Z',
      },
    ]
    const upstream = [
      fill({ fillId: '1163440', fillSize: 2, ssboe }),
      fill({ fillId: '1163441', fillSize: 3, ssboe: ssboe + 1 }),
      fill({
        fillId: '1163450',
        transactionType: 'SELL',
        fillSize: 5,
        fillPrice: 5801,
        ssboe: closeSsboe,
      }),
    ]
    expect(uncoveredTradesByFillIdentity(trades, upstream)).toEqual([])
  })

  it('still refuses when stored scale-in qty exceeds upstream lineage qty (B1)', () => {
    const ssboe = Date.parse('2026-10-20T14:00:00Z') / 1000
    const trades = [
      {
        accountNumber: ACCOUNT,
        instrument: 'MES',
        side: 'Long',
        quantity: 3,
        entryPrice: 5800,
        closePrice: 5801,
        entryId: '1163441',
        closeId: '1163450',
        entryDate: '2026-10-20T14:00:00.000Z',
        closeDate: '2026-10-20T14:00:02.000Z',
      },
      {
        accountNumber: ACCOUNT,
        instrument: 'MES',
        side: 'Long',
        quantity: 3,
        entryPrice: 5800,
        closePrice: 5801,
        entryId: '1163441',
        closeId: '1163450',
        entryDate: '2026-10-20T14:00:00.000Z',
        closeDate: '2026-10-20T14:00:02.000Z',
      },
    ]
    const upstream = [
      fill({ fillId: '1163440', fillSize: 2, ssboe }),
      fill({ fillId: '1163441', fillSize: 3, ssboe: ssboe + 1 }),
      fill({
        fillId: '1163450',
        transactionType: 'SELL',
        fillSize: 5,
        fillPrice: 5801,
        ssboe: ssboe + 2,
      }),
    ]
    expect(uncoveredTradesByFillIdentity(trades, upstream)).toHaveLength(1)
  })

  it('rejects a direct-id match with the wrong side or price', () => {
    expect(
      protocolTradeCoveredByRawFills(
        {
          accountNumber: ACCOUNT,
          instrument: 'MES',
          side: 'Long',
          quantity: 1,
          entryPrice: 5800,
          closePrice: 5801,
          entryId: '1001',
          closeId: '1002',
          entryDate: '2026-10-20T14:00:00.000Z',
          closeDate: '2026-10-20T14:00:01.000Z',
        },
        [
          fill({
            fillId: '1001',
            transactionType: 'SELL',
            fillPrice: 5800,
          }),
          fill({
            fillId: '1002',
            transactionType: 'SELL',
            fillPrice: 5801,
            ssboe: Date.parse('2026-10-20T14:00:01Z') / 1000,
          }),
        ],
      ),
    ).toBe(false)
  })
})

describe('fifoTieChangesOutcome (F1)', () => {
  it('ignores same-side same-price ties', () => {
    const ms = Date.parse('2026-11-02T15:00:00Z') / 1000
    expect(
      fifoTieChangesOutcome([
        fill({ fillId: 'a', fillPrice: 5800, ssboe: ms }),
        fill({ fillId: 'b', fillPrice: 5800, ssboe: ms }),
      ]),
    ).toBe(false)
  })

  it('refuses when reversing a buy/sell tie changes residual lots', () => {
    const ms = Date.parse('2026-11-02T15:00:00Z') / 1000
    expect(
      fifoTieChangesOutcome([
        fill({ fillId: 'b1', fillPrice: 5800, ssboe: ms }),
        fill({
          fillId: 's1',
          transactionType: 'SELL',
          fillPrice: 5801,
          ssboe: ms,
        }),
      ]),
    ).toBe(true)
  })

  it('ignores a pre-anchor multi-price sweep once the book is flat (F1)', () => {
    const sweep = Date.parse('2026-01-15T15:00:00Z') / 1000
    const windowStartMs = Date.parse('2026-09-25T22:00:00Z')
    const laterBuy = Date.parse('2026-10-20T14:00:00Z') / 1000
    const laterSell = Date.parse('2026-10-20T14:00:01Z') / 1000
    const fills = [
      fill({ fillId: 'old-b', fillPrice: 5800, ssboe: sweep }),
      fill({
        fillId: 'old-s',
        transactionType: 'SELL',
        fillPrice: 5801,
        ssboe: sweep,
      }),
      fill({ fillId: 'win-b', ssboe: laterBuy }),
      fill({
        fillId: 'win-s',
        transactionType: 'SELL',
        fillPrice: 5801,
        ssboe: laterSell,
      }),
    ]
    expect(fifoTieChangesOutcome(fills)).toBe(true)
    expect(fifoTieChangesOutcome(fills, { windowStartMs })).toBe(false)
    expect(lastFlatPointBefore(fills, windowStartMs).flatAtBoundary).toBe(true)
    expect(lastFlatYmdBeforeAnchor(fills, windowStartMs)).toBe('2026-01-15')
  })

  it('does not scan a book that is not being rebuilt', () => {
    const ms = Date.parse('2026-11-02T15:00:00Z') / 1000
    expect(
      fifoTieChangesOutcome(
        [
          fill({
            fillId: 'nq-b',
            symbol: 'NQZ6',
            fillPrice: 16000,
            ssboe: ms,
          }),
          fill({
            fillId: 'nq-s',
            symbol: 'NQZ6',
            transactionType: 'SELL',
            fillPrice: 16001,
            ssboe: ms,
          }),
        ],
        { instruments: ['MES'] },
      ),
    ).toBe(false)
  })
})

describe('skippedOrdinaryRangeIsQuiet (F9)', () => {
  it('fails closed without dates or last-flat on an empty ledger', () => {
    expect(
      skippedOrdinaryRangeIsQuiet({
        ordinaryStartYmd: '2026-09-01',
        fetchStartYmd: '2026-09-25',
        storedFills: [],
      }),
    ).toBe(false)
  })

  it('treats a prefix before the first order date as quiet', () => {
    expect(
      skippedOrdinaryRangeIsQuiet({
        ordinaryStartYmd: '2013-01-01',
        fetchStartYmd: '2026-09-25',
        storedFills: [],
        orderHistoryDates: ['20260925'],
      }),
    ).toBe(true)
  })

  it('accepts a last-flat skip when stored fills flattened at the fetch start', () => {
    expect(
      skippedOrdinaryRangeIsQuiet({
        ordinaryStartYmd: '2013-01-01',
        fetchStartYmd: '2026-01-15',
        storedFills: [
          fill({
            fillId: 'old',
            fillDate: '20260114',
            ssboe: Date.parse('2026-01-14T15:00:00Z') / 1000,
          }),
        ],
        lastFlatYmd: '2026-01-15',
      }),
    ).toBe(true)
  })

  it('accepts a last-flat skip when the flattening fill sits on fetch start (F-LF)', () => {
    expect(
      skippedOrdinaryRangeIsQuiet({
        ordinaryStartYmd: '2013-01-01',
        fetchStartYmd: '2026-01-15',
        storedFills: [
          fill({
            fillId: 'on-start',
            fillDate: '20260115',
            ssboe: Date.parse('2026-01-15T15:00:00Z') / 1000,
          }),
        ],
        lastFlatYmd: '2026-01-15',
      }),
    ).toBe(true)
  })
})

describe('fillsInOrdinaryFetchRange (F2)', () => {
  it('keeps fills on or after the ordinary start day', () => {
    const rows = fillsInOrdinaryFetchRange(
      [
        fill({ fillId: 'old', fillDate: '20260801', ssboe: Date.parse('2026-08-01T15:00:00Z') / 1000 }),
        fill({ fillId: 'in', fillDate: '20260901', ssboe: Date.parse('2026-09-01T15:00:00Z') / 1000 }),
      ],
      Date.parse('2026-09-01T00:00:00Z'),
      '2026-09-01',
    )
    expect(rows.map((row) => row.fillId)).toEqual(['in'])
  })
})

describe('coverageIncludesYmd', () => {
  it('ignores unresolved windows', () => {
    expect(
      coverageIncludesYmd({
        coverage: [
          {
            startYmd: '2026-09-01',
            endYmd: '2026-09-30',
            historyFillCount: 0,
            historyStatus: 'no_data',
            fallbackFillCount: 0,
            fallbackStatus: 'skipped',
            fallbackDates: [],
            resolved: false,
            source: 'unresolved',
          },
        ],
        ymd: '2026-09-01',
      }),
    ).toBe(false)
  })
})
