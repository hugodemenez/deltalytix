import { describe, expect, it } from 'vitest'
import {
  RITHMIC_PROTOCOL_OPENING_SEED_TAG,
  RITHMIC_PROTOCOL_TRADE_TAG,
} from '@/lib/trade-id-utils'
import { openingSeedOrderId } from './opening-position'
import { buildTradesFromRithmicFills } from './fills-to-trades'
import { fillIdentityKey, markFillSource } from './dedupe-fills'
import type { RithmicProtocolFill } from './types'
import {
  buildLedgerSeenIndex,
  canonicalLedgerFillIds,
  deriveTradesFromFillLedger,
  dropSeenLedgerFills,
  hasTradeJournalAnnotations,
  mergeFillLedgers,
  partitionIncomingFills,
  phantomProtocolTradeIds,
  prepareRithmicProtocolFills,
  reattachProtocolTradeAnnotations,
  shouldReplaceStoredFill,
  summarizeFillLedgerNets,
  uncoveredProtocolTrades,
  duplicateRebuildTradeIds,
  protocolTradeSetsMatch,
} from './fill-ledger'

const ACCOUNT = 'LFE050-TEST-LEDGER'
const tickBySymbol = new Map([['MES', { tickSize: 0.25, tickValue: 1.25 }]])
const at = (iso: string) => Date.parse(iso) / 1000

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

const day1Sell = markFillSource(
  [
    fill({
      fillId: '1002',
      fillDate: '20260930',
      transactionType: 'SELL',
      fillPrice: 7801,
      ssboe: at('2026-09-30T14:00:00Z'),
    }),
  ],
  'history',
)[0]

const day1Buy = markFillSource(
  [
    fill({
      fillId: '1001',
      fillDate: '20260930',
      ssboe: at('2026-09-30T14:05:00Z'),
    }),
  ],
  'history',
)[0]

const day3Buy = markFillSource(
  [
    fill({
      fillId: '2001',
      fillDate: '20261002',
      fillPrice: 7810,
      ssboe: at('2026-10-02T14:00:00Z'),
    }),
  ],
  'history',
)[0]

const day3Sell = markFillSource(
  [
    fill({
      fillId: '2002',
      fillDate: '20261002',
      transactionType: 'SELL',
      fillPrice: 7811,
      ssboe: at('2026-10-02T14:10:00Z'),
    }),
  ],
  'history',
)[0]

function overnightCount(
  trades: Array<{ entryDate: string; closeDate: string }>,
): number {
  return trades.filter((trade) => {
    const entryDay = trade.entryDate.slice(0, 10)
    const closeDay = trade.closeDate.slice(0, 10)
    return entryDay !== closeDay
  }).length
}

describe('fill ledger upsert / dedupe', () => {
  it('skips incoming fills whose identity is already stored', () => {
    const seen = buildLedgerSeenIndex([day1Buy])
    const { novel, skipped } = dropSeenLedgerFills(
      [day1Buy, day1Sell],
      seen,
    )
    expect(skipped).toBe(1)
    expect(novel).toEqual([day1Sell])
  })

  it('partitions inserts vs replay→history upgrades vs skips', () => {
    const storedReplay = { ...day1Buy, source: 'replay' as const }
    const { inserts, updates, skipped } = partitionIncomingFills(
      [day1Buy, day1Buy, day1Sell],
      [storedReplay],
    )
    expect(inserts).toEqual([day1Sell])
    expect(updates).toEqual([day1Buy])
    expect(skipped).toBe(1)
  })

  it('does not replace stored history with a replay restatement', () => {
    expect(shouldReplaceStoredFill(day1Buy, { ...day1Buy, source: 'replay' })).toBe(
      false,
    )
  })

  it('canonicalizes basketId_fillId to the same identity as history', () => {
    const history = day1Buy
    const replayTwin = markFillSource(
      [
        fill({
          fillId: `239200544_${history.fillId}`,
          ssboe: (history.ssboe ?? 0) + 3,
        }),
      ],
      'replay',
    )[0]
    expect(fillIdentityKey(replayTwin)).toBe(fillIdentityKey(history))
    const { novel, skipped } = dropSeenLedgerFills(
      [replayTwin],
      buildLedgerSeenIndex([history]),
    )
    expect(skipped).toBe(1)
    expect(novel).toEqual([])
    const prepared = prepareRithmicProtocolFills([history, replayTwin])
    expect(prepared.fills).toHaveLength(1)
    expect(prepared.fills[0].source).toBe('history')
    expect(prepared.stats.afterDedup).toBe(1)
    expect(prepared.stats.afterConsolidate).toBe(1)
  })

  it('keeps afterDedup as the pre-consolidate count', () => {
    const pieces = markFillSource(
      [
        fill({
          fillId: '1245660',
          transactionType: 'SELL',
          fillPrice: 7761,
          fillSize: 1,
          ssboe: at('2026-09-30T13:57:21Z'),
        }),
        fill({
          fillId: '1245661',
          transactionType: 'SELL',
          fillPrice: 7761,
          fillSize: 1,
          ssboe: at('2026-09-30T13:57:21Z'),
        }),
      ],
      'replay',
    )
    const prepared = prepareRithmicProtocolFills(pieces)
    expect(prepared.stats.afterDedup).toBe(2)
    expect(prepared.stats.afterConsolidate).toBe(1)
    expect(prepared.fills).toHaveLength(1)
  })
})

describe('uncoveredProtocolTrades', () => {
  it('flags stored trades whose legs are missing from the merged ledger', () => {
    const uncovered = uncoveredProtocolTrades(
      [
        {
          id: 'covered',
          entryId: '1001',
          closeId: '1002',
          pnl: 1,
        },
        {
          id: 'missing-close',
          entryId: '1001',
          closeId: 'y',
          pnl: 2,
        },
        {
          id: 'no-ids',
          pnl: 3,
        },
      ],
      canonicalLedgerFillIds([day1Buy, day1Sell]),
    )
    expect(uncovered.map((row) => row.id)).toEqual(['missing-close', 'no-ids'])
  })

  it('treats a synthetic opening-seed entry as covered when the close fill is on the ledger', () => {
    const uncovered = uncoveredProtocolTrades(
      [
        {
          id: 'seed-close',
          entryId: openingSeedOrderId(ACCOUNT, 'MESZ6'),
          closeId: '1002',
          pnl: 0,
        },
        {
          id: 'seed-missing-close',
          entryId: openingSeedOrderId(ACCOUNT, 'MESZ6'),
          closeId: 'nope',
          pnl: 0,
        },
      ],
      canonicalLedgerFillIds([day1Buy, day1Sell]),
    )
    expect(uncovered.map((row) => row.id)).toEqual(['seed-missing-close'])
  })

  it('does not treat the opening-seed tag as a journal annotation', () => {
    expect(
      hasTradeJournalAnnotations({
        id: 'seed',
        tags: [RITHMIC_PROTOCOL_TRADE_TAG, RITHMIC_PROTOCOL_OPENING_SEED_TAG],
      }),
    ).toBe(false)
  })
})

describe('gap then fill closes leftover without inventing overnight short', () => {
  // Incomplete ShowFillHistory: the same-day cover for the Sep 30 short is
  // missing, so FIFO pairs that leftover with an Oct 2 buy (phantom overnight
  // short). Persisting the missing fill on the ledger and re-deriving closes
  // Sep 30 against itself; Oct 2 stays a same-day long.
  const incomplete = [day1Sell, day3Buy, day3Sell]
  const gapFill = day1Buy

  it('incomplete snapshot FIFO-pairs the leftover short with a later day', () => {
    const { trades } = buildTradesFromRithmicFills(
      incomplete,
      'u1',
      tickBySymbol,
    )
    expect(overnightCount(trades)).toBeGreaterThan(0)
    const overnight = trades.find(
      (trade) => trade.entryDate.slice(0, 10) !== trade.closeDate.slice(0, 10),
    )
    expect(overnight?.side).toBe('Short')
    expect(overnight?.entryId).toBe('1002')
    expect(overnight?.closeId).toBe('2001')
  })

  it('persisting the missing same-day cover rebuilds two same-day round trips', () => {
    const prepared = deriveTradesFromFillLedger(incomplete, [gapFill])
    const { trades, openSkipped } = buildTradesFromRithmicFills(
      prepared.fills,
      'u1',
      tickBySymbol,
    )
    expect(openSkipped).toBe(0)
    expect(trades).toHaveLength(2)
    expect(overnightCount(trades)).toBe(0)
    expect(trades.map((trade) => [trade.side, trade.entryId, trade.closeId])).toEqual([
      ['Short', '1002', '1001'],
      ['Long', '2001', '2002'],
    ])
  })

  it('delete+resync from the ledger does not re-invent the overnight pair', () => {
    const ledger = mergeFillLedgers(incomplete, [gapFill])
    const prepared = prepareRithmicProtocolFills(ledger)
    const first = buildTradesFromRithmicFills(prepared.fills, 'u1', tickBySymbol)
    const again = buildTradesFromRithmicFills(prepared.fills, 'u1', tickBySymbol)
    expect(overnightCount(first.trades)).toBe(0)
    expect(overnightCount(again.trades)).toBe(0)
    expect(again.trades.map((trade) => [trade.entryId, trade.closeId])).toEqual(
      first.trades.map((trade) => [trade.entryId, trade.closeId]),
    )
  })

  it('marks the leftover overnight row as a phantom once both legs are in the ledger', () => {
    const derived = buildTradesFromRithmicFills(
      deriveTradesFromFillLedger(incomplete, [gapFill]).fills,
      'u1',
      tickBySymbol,
    ).trades
    const phantom = {
      id: 'phantom-overnight',
      accountNumber: ACCOUNT,
      instrument: 'MES',
      entryDate: '2026-09-30T14:00:00.000+00:00',
      closeDate: '2026-10-02T14:00:00.000+00:00',
      entryId: '1002',
      closeId: '2001',
      tags: [RITHMIC_PROTOCOL_TRADE_TAG],
    }
    const ids = phantomProtocolTradeIds({
      existing: [phantom],
      derived,
      ledgerFillIds: canonicalLedgerFillIds([...incomplete, gapFill]),
    })
    expect(ids).toEqual(['phantom-overnight'])
  })

  it('keeps a journal-annotated phantom instead of wiping the note', () => {
    const derived = buildTradesFromRithmicFills(
      deriveTradesFromFillLedger(incomplete, [gapFill]).fills,
      'u1',
      tickBySymbol,
    ).trades
    const annotated = {
      id: 'keep-note',
      accountNumber: ACCOUNT,
      instrument: 'MES',
      entryDate: '2026-09-30T14:00:00.000+00:00',
      closeDate: '2026-10-02T14:00:00.000+00:00',
      entryId: '1002',
      closeId: '2001',
      tags: [RITHMIC_PROTOCOL_TRADE_TAG],
      comment: 'setup I want to keep',
    }
    expect(hasTradeJournalAnnotations(annotated)).toBe(true)
    expect(
      phantomProtocolTradeIds({
        existing: [annotated],
        derived,
        ledgerFillIds: canonicalLedgerFillIds([...incomplete, gapFill]),
      }),
    ).toEqual([])
  })
})

describe('prepare does not rewrite fills from a terminal net', () => {
  // Fills cannot tell a live short from missing opening buys. The old
  // trimPreWindowOpeningCovers heuristic always chose "missing history"
  // and rewrote real trades. prepare must leave the stream intact.

  function signedNet(rows: RithmicProtocolFill[]) {
    return rows.reduce((sum, row) => {
      const qty = Math.abs(Number(row.fillSize) || 0)
      return sum + (row.transactionType === 'BUY' ? qty : -qty)
    }, 0)
  }

  it('counterexample A: scale-out of a live short keeps P&L and the open lot', () => {
    const fills = markFillSource(
      [
        fill({
          fillId: 'F1',
          fillDate: '20260930',
          transactionType: 'SELL',
          fillPrice: 100,
          ssboe: at('2026-09-30T14:00:00Z'),
        }),
        fill({
          fillId: 'F2',
          fillDate: '20261001',
          transactionType: 'SELL',
          fillPrice: 110,
          ssboe: at('2026-10-01T14:00:00Z'),
        }),
        fill({
          fillId: 'F3',
          fillDate: '20261002',
          transactionType: 'BUY',
          fillPrice: 105,
          ssboe: at('2026-10-02T14:00:00Z'),
        }),
      ],
      'history',
    )
    const prepared = prepareRithmicProtocolFills(fills)
    expect(prepared.fills.map((row) => row.fillId)).toEqual(['F1', 'F2', 'F3'])
    expect('pre_window_covers' in prepared.stats.dropped).toBe(false)
    const { trades, openSkipped } = buildTradesFromRithmicFills(
      prepared.fills,
      'u1',
      tickBySymbol,
    )
    expect(openSkipped).toBe(1)
    expect(trades).toHaveLength(1)
    expect(trades[0].side).toBe('Short')
    expect(trades[0].entryId).toBe('F1')
    expect(trades[0].closeId).toBe('F3')
    expect(Number(trades[0].entryPrice)).toBe(100)
    expect(Number(trades[0].closePrice)).toBe(105)
  })

  it('counterexample B: partial cover of a live short is not resized', () => {
    const fills = markFillSource(
      [
        fill({
          fillId: 'S2',
          fillDate: '20260930',
          transactionType: 'SELL',
          fillPrice: 100,
          fillSize: 2,
          ssboe: at('2026-09-30T14:00:00Z'),
        }),
        fill({
          fillId: 'B1',
          fillDate: '20261001',
          fillPrice: 95,
          fillSize: 1,
          ssboe: at('2026-10-01T14:00:00Z'),
        }),
      ],
      'history',
    )
    const prepared = prepareRithmicProtocolFills(fills)
    expect(prepared.fills[0]?.fillSize).toBe(2)
    expect(prepared.fills.map((row) => row.fillId)).toEqual(['S2', 'B1'])
    const { trades, openSkipped } = buildTradesFromRithmicFills(
      prepared.fills,
      'u1',
      tickBySymbol,
    )
    expect(openSkipped).toBe(1)
    expect(trades).toHaveLength(1)
    expect(trades[0].side).toBe('Short')
  })

  it('counterexample C: a live long is not turned into an invented overnight short', () => {
    const fills = markFillSource(
      [
        fill({
          fillId: 'B1',
          fillDate: '20260930',
          fillPrice: 100,
          ssboe: at('2026-09-30T14:00:00Z'),
        }),
        fill({
          fillId: 'S1',
          fillDate: '20261002',
          transactionType: 'SELL',
          fillPrice: 110,
          ssboe: at('2026-10-02T14:00:00Z'),
        }),
        fill({
          fillId: 'B2',
          fillDate: '20261004',
          fillPrice: 105,
          fillSize: 2,
          ssboe: at('2026-10-04T14:00:00Z'),
        }),
      ],
      'history',
    )
    const prepared = prepareRithmicProtocolFills(fills)
    expect(prepared.fills.map((row) => row.fillId)).toEqual(['B1', 'S1', 'B2'])
    const { trades, openSkipped } = buildTradesFromRithmicFills(
      prepared.fills,
      'u1',
      tickBySymbol,
    )
    expect(openSkipped).toBe(2)
    expect(trades).toHaveLength(1)
    expect(trades[0].side).toBe('Long')
    expect(trades[0].entryId).toBe('B1')
    expect(trades[0].closeId).toBe('S1')
  })

  it('counterexample D: a UTC-midnight scalp does not drop the first fill', () => {
    const fills = markFillSource(
      [
        fill({
          fillId: 'F1',
          fillDate: '20260930',
          transactionType: 'SELL',
          fillPrice: 100,
          ssboe: at('2026-09-30T14:00:00Z'),
        }),
        fill({
          fillId: 'F2',
          fillDate: '20260930',
          fillPrice: 98,
          ssboe: at('2026-09-30T15:00:00Z'),
        }),
        fill({
          fillId: 'F3',
          fillDate: '20261001',
          fillPrice: 99,
          ssboe: at('2026-10-01T23:59:50Z'),
        }),
        fill({
          fillId: 'F4',
          fillDate: '20261002',
          transactionType: 'SELL',
          fillPrice: 99.5,
          ssboe: at('2026-10-02T00:00:20Z'),
        }),
        fill({
          fillId: 'F5',
          fillDate: '20261002',
          transactionType: 'SELL',
          fillPrice: 101,
          ssboe: at('2026-10-02T14:00:00Z'),
        }),
      ],
      'history',
    )
    const prepared = prepareRithmicProtocolFills(fills)
    expect(prepared.fills.map((row) => row.fillId)).toEqual([
      'F1',
      'F2',
      'F3',
      'F4',
      'F5',
    ])
    const { trades, openSkipped } = buildTradesFromRithmicFills(
      prepared.fills,
      'u1',
      tickBySymbol,
    )
    expect(openSkipped).toBe(1)
    expect(trades.map((trade) => [trade.side, trade.entryId, trade.closeId])).toEqual([
      ['Short', 'F1', 'F2'],
      ['Long', 'F3', 'F4'],
    ])
  })

  it('does not flatten a genuine open short whose extra sells are at the tail', () => {
    const liveShort = markFillSource(
      [
        day1Buy,
        day1Sell,
        fill({
          fillId: 'live-short',
          fillDate: '20261002',
          transactionType: 'SELL',
          fillPrice: 7812,
          fillSize: 2,
          ssboe: at('2026-10-02T15:00:00Z'),
        }),
      ],
      'history',
    )
    expect(signedNet(liveShort)).toBe(-2)
    const prepared = prepareRithmicProtocolFills(liveShort)
    expect(prepared.fills).toHaveLength(3)
    const { openSkipped, trades } = buildTradesFromRithmicFills(
      prepared.fills,
      'u1',
      tickBySymbol,
    )
    expect(openSkipped).toBe(2)
    expect(
      trades.filter(
        (trade) => trade.entryDate.slice(0, 10) !== trade.closeDate.slice(0, 10),
      ),
    ).toEqual([])
  })

  it('leaves a balanced multi-day short hold alone', () => {
    const overnightHold = markFillSource(
      [
        fill({
          fillId: 'hold-in',
          fillDate: '20260930',
          transactionType: 'SELL',
          fillPrice: 7800,
          fillSize: 2,
          ssboe: at('2026-09-30T14:00:00Z'),
        }),
        fill({
          fillId: 'hold-out',
          fillDate: '20261002',
          fillPrice: 7790,
          fillSize: 2,
          ssboe: at('2026-10-02T14:00:00Z'),
        }),
      ],
      'history',
    )
    const prepared = prepareRithmicProtocolFills(overnightHold)
    expect('pre_window_covers' in prepared.stats.dropped).toBe(false)
    const { trades, openSkipped } = buildTradesFromRithmicFills(
      prepared.fills,
      'u1',
      tickBySymbol,
    )
    expect(openSkipped).toBe(0)
    expect(trades).toHaveLength(1)
    expect(trades[0].side).toBe('Short')
    expect(overnightCount(trades)).toBe(1)
  })

  it('reports a 2-sell imbalance but does not drop those sells (rebuild alone cannot fix Jérémie phantoms)', () => {
    const preWindowCovers = markFillSource(
      [
        fill({
          fillId: 'cover-1',
          fillDate: '20260930',
          transactionType: 'SELL',
          fillPrice: 7802,
          ssboe: at('2026-09-30T13:50:00Z'),
        }),
        fill({
          fillId: 'cover-2',
          fillDate: '20260930',
          transactionType: 'SELL',
          fillPrice: 7802.25,
          ssboe: at('2026-09-30T13:50:01Z'),
        }),
      ],
      'history',
    )
    const imbalanced = [...preWindowCovers, day1Buy, day1Sell, day3Buy, day3Sell]
    expect(signedNet(imbalanced)).toBe(-2)
    const prepared = prepareRithmicProtocolFills(imbalanced)
    expect(prepared.fills.map((row) => row.fillId)).toEqual(
      imbalanced.map((row) => row.fillId),
    )
    expect(summarizeFillLedgerNets(prepared.fills)).toEqual([
      {
        accountId: ACCOUNT,
        symbol: 'MESZ6',
        instrument: 'MES',
        net: -2,
        fillCount: 6,
      },
    ])
    const { trades, openSkipped } = buildTradesFromRithmicFills(
      prepared.fills,
      'u1',
      tickBySymbol,
    )
    expect(openSkipped).toBe(2)
    expect(
      trades.some(
        (trade) =>
          trade.side === 'Short' &&
          trade.entryDate.slice(0, 10) !== trade.closeDate.slice(0, 10),
      ),
    ).toBe(true)
  })

  it('reports MESU6 and MESZ6 nets separately so one month cannot trim the other', () => {
    const fills = markFillSource(
      [
        fill({
          fillId: 'u6-b',
          symbol: 'MESU6',
          fillDate: '20260901',
          ssboe: at('2026-09-01T14:00:00Z'),
        }),
        fill({
          fillId: 'u6-s',
          symbol: 'MESU6',
          fillDate: '20260903',
          transactionType: 'SELL',
          fillPrice: 7810,
          ssboe: at('2026-09-03T14:00:00Z'),
        }),
        fill({
          fillId: 'z6-b',
          symbol: 'MESZ6',
          fillDate: '20261004',
          fillPrice: 7805,
          ssboe: at('2026-10-04T14:00:00Z'),
        }),
      ],
      'history',
    )
    expect(summarizeFillLedgerNets(fills)).toEqual([
      {
        accountId: ACCOUNT,
        symbol: 'MESZ6',
        instrument: 'MES',
        net: 1,
        fillCount: 1,
      },
    ])
    const prepared = prepareRithmicProtocolFills(fills)
    expect(prepared.fills.map((row) => row.fillId)).toEqual(['u6-b', 'u6-s', 'z6-b'])
  })
})

describe('reattachProtocolTradeAnnotations', () => {
  it('copies journal fields onto the matching rebuilt fill pair', () => {
    const derived = [
      {
        id: 'new-id',
        accountNumber: ACCOUNT,
        instrument: 'MES',
        entryDate: '2026-09-30T14:00:00.000+00:00',
        closeDate: '2026-09-30T14:05:00.000+00:00',
        entryId: '1002',
        closeId: '1001',
        tags: [RITHMIC_PROTOCOL_TRADE_TAG],
      },
    ]
    const existing = [
      {
        id: 'kept-row',
        accountNumber: ACCOUNT,
        instrument: 'MES',
        entryDate: '2026-09-30T14:00:00.000+00:00',
        closeDate: '2026-09-30T14:05:00.000+00:00',
        entryId: '1002',
        closeId: '1001',
        tags: [RITHMIC_PROTOCOL_TRADE_TAG, 'setup'],
        comment: 'keep me',
      },
    ]
    const result = reattachProtocolTradeAnnotations(derived, existing)
    expect(result.preserved).toBe(1)
    expect(result.unmatched).toEqual([])
    expect(result.trades[0]?.id).toBe('kept-row')
    expect(result.trades[0]?.comment).toBe('keep me')
    expect(result.trades[0]?.tags).toEqual([
      RITHMIC_PROTOCOL_TRADE_TAG,
      'setup',
    ])
  })

  it('reports annotated rows that FIFO no longer produces', () => {
    const derived = [
      {
        id: 'new-id',
        accountNumber: ACCOUNT,
        instrument: 'MES',
        entryDate: '2026-10-02T14:00:00.000+00:00',
        closeDate: '2026-10-02T14:10:00.000+00:00',
        entryId: '2001',
        closeId: '2002',
        tags: [RITHMIC_PROTOCOL_TRADE_TAG],
      },
    ]
    const existing = [
      {
        id: 'orphan-note',
        accountNumber: ACCOUNT,
        instrument: 'MES',
        entryDate: '2026-09-30T14:00:00.000+00:00',
        closeDate: '2026-10-02T14:00:00.000+00:00',
        entryId: '1002',
        closeId: '2001',
        tags: [RITHMIC_PROTOCOL_TRADE_TAG],
        comment: 'phantom I annotated',
      },
    ]
    const result = reattachProtocolTradeAnnotations(derived, existing)
    expect(result.preserved).toBe(0)
    expect(result.unmatched.map((row) => row.id)).toEqual(['orphan-note'])
  })

  it('reuses the matched id on an unannotated row so analytics can survive', () => {
    const derived = [
      {
        id: 'gen-2',
        accountNumber: ACCOUNT,
        instrument: 'MES',
        entryDate: '2026-09-30T14:00:00.000+00:00',
        closeDate: '2026-09-30T14:05:00.000+00:00',
        entryId: '1001',
        closeId: '1002',
        tags: [RITHMIC_PROTOCOL_TRADE_TAG],
      },
    ]
    const existing = [
      {
        id: 'legacy-1',
        accountNumber: ACCOUNT,
        instrument: 'MES',
        entryDate: '2026-09-30T14:00:00.000+00:00',
        closeDate: '2026-09-30T14:05:00.000+00:00',
        entryId: '1001',
        closeId: '1002',
        tags: [RITHMIC_PROTOCOL_TRADE_TAG],
      },
    ]
    const result = reattachProtocolTradeAnnotations(derived, existing)
    expect(result.preserved).toBe(0)
    expect(result.trades[0]?.id).toBe('legacy-1')
  })

  it('treats a comment change as a drifted trade set', () => {
    const base = {
      id: 't1',
      tags: [RITHMIC_PROTOCOL_TRADE_TAG],
    }
    expect(protocolTradeSetsMatch([base], [base])).toBe(true)
    expect(
      protocolTradeSetsMatch([base], [{ ...base, comment: 'new note' }]),
    ).toBe(false)
    expect(duplicateRebuildTradeIds(['a', 'b', 'a'])).toEqual(['a'])
  })
})
