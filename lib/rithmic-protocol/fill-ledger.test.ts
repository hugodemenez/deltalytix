import { describe, expect, it, vi } from 'vitest'
import { RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
import { buildTradesFromRithmicFills } from './fills-to-trades'
import { fillIdentityKey, filterRithmicProtocolTradesCoveredByStoredRows, markFillSource } from './dedupe-fills'
import type { RithmicProtocolFill } from './types'
import {
  buildLedgerSeenIndex,
  canonicalLedgerFillIds,
  classifyStoredProtocolTrade,
  deriveTradesFromFillLedger,
  dropSeenLedgerFills,
  hasTradeJournalAnnotations,
  manualFillBookRelation,
  manualTradeReplacedByPlantTrade,
  mergeFillLedgers,
  omitAmbiguousManualBooks,
  planManualFillSyncEffects,
  partitionIncomingFills,
  phantomProtocolTradeIds,
  prepareRithmicProtocolFills,
  resolvePersistedProtocolTradeId,
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
      hasTradeJournalAnnotations({
        ...annotated,
        comment: null,
        commentUndecryptable: true,
      }),
    ).toBe(true)
    expect(
      phantomProtocolTradeIds({
        existing: [{ ...annotated, comment: null, commentUndecryptable: true }],
        derived,
        ledgerFillIds: canonicalLedgerFillIds([...incomplete, gapFill]),
      }),
    ).toEqual([])
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

describe('manual fills', () => {
  const atMs = Date.parse('2026-09-25T15:07:00Z')
  const manual = markFillSource(
    [
      fill({
        fillId: 'manual-gap',
        fillSize: 2,
        fillPrice: 5810.25,
        fillDate: '20260925',
        ssboe: atMs / 1000,
      }),
    ],
    'manual',
  )[0]
  const upstream = markFillSource(
    [
      fill({
        fillId: '88421',
        fillSize: 2,
        fillPrice: 5810.25,
        fillDate: '20260925',
        ssboe: atMs / 1000 + 3,
      }),
    ],
    'history',
  )[0]
  const nearbyOneLot = markFillSource(
    [
      fill({
        fillId: '88422',
        fillSize: 1,
        fillPrice: 5810.25,
        fillDate: '20260925',
        ssboe: atMs / 1000 + 1,
      }),
    ],
    'history',
  )[0]

  it('never overwrites a manual row or lets a manual row replace a plant fill', () => {
    expect(shouldReplaceStoredFill(manual, { ...manual, source: 'history' })).toBe(false)
    expect(shouldReplaceStoredFill(day1Buy, manual)).toBe(false)
    const { updates } = partitionIncomingFills([day1Sell], [manual])
    expect(updates).toEqual([])
  })

  it('keeps a manual fill through merge and the ordinary sync ledger', () => {
    const merged = mergeFillLedgers([manual, day1Sell], [day1Buy])
    expect(merged.map((row) => row.fillId).sort()).toEqual(
      ['1001', '1002', 'manual-gap'].sort(),
    )
    const prepared = deriveTradesFromFillLedger([manual, day1Sell], [day1Buy])
    expect(prepared.fills.map((row) => row.fillId)).toContain('manual-gap')
    expect(prepared.fills.find((row) => row.fillId === 'manual-gap')?.source).toBe(
      'manual',
    )
    expect(prepared.fills.find((row) => row.fillId === 'manual-gap')?.fillSize).toBe(2)
  })

  it('prefers a consolidated upstream fill within 30s and logs it', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    try {
      const merged = mergeFillLedgers([manual], [upstream])
      expect(merged.map((row) => row.fillId).sort()).toEqual(['88421', 'manual-gap'])
      const prepared = deriveTradesFromFillLedger([manual], [upstream])
      expect(prepared.fills).toHaveLength(1)
      expect(prepared.fills[0]?.fillId).toBe('88421')
      expect(prepared.fills[0]?.fillSize).toBe(2)
      expect(prepared.retirements).toHaveLength(1)
      expect(prepared.retirements[0]?.manual.fillId).toBe('manual-gap')
      expect(planManualFillSyncEffects(prepared).droppedByReason.manual_fill_superseded).toBe(1)
      expect(info).toHaveBeenCalledWith(
        expect.stringContaining(
          'preferring upstream fillId=88421 over manual fillId=manual-gap',
        ),
      )
    } finally {
      info.mockRestore()
    }
  })

  it('keeps the manual when a matching replay twin is filtered by history', () => {
    const historyCover = markFillSource(
      [
        fill({
          fillId: '88000',
          fillSize: 1,
          fillPrice: 5800,
          fillDate: '20260925',
          ssboe: atMs / 1000 + 3600,
        }),
      ],
      'history',
    )[0]
    const replayTwin = markFillSource(
      [
        fill({
          fillId: '9001',
          fillSize: 2,
          fillPrice: 5810.25,
          fillDate: '20260925',
          ssboe: atMs / 1000,
        }),
      ],
      'replay',
    )[0]
    const prepared = prepareRithmicProtocolFills([manual, historyCover, replayTwin])
    const ids = prepared.fills.map((row) => row.fillId)
    expect(ids).toContain('manual-gap')
    expect(ids).toContain('88000')
    expect(ids).not.toContain('9001')
    expect(prepared.fills.find((row) => row.fillId === 'manual-gap')?.fillSize).toBe(2)
  })

  it('retires a manual 2-lot against consolidated 1+1 split pieces', () => {
    const pieceA = markFillSource(
      [
        fill({
          fillId: '9100',
          fillSize: 1,
          fillPrice: 5810.25,
          fillDate: '20260925',
          ssboe: atMs / 1000,
        }),
      ],
      'history',
    )[0]
    const pieceB = markFillSource(
      [
        fill({
          fillId: '9101',
          fillSize: 1,
          fillPrice: 5810.25,
          fillDate: '20260925',
          ssboe: atMs / 1000 + 1,
        }),
      ],
      'history',
    )[0]
    const prepared = prepareRithmicProtocolFills([manual, pieceA, pieceB])
    expect(prepared.fills.map((row) => row.fillId)).toEqual(['9101'])
    expect(prepared.fills[0]?.fillSize).toBe(2)
  })

  it('retires a manual fill against a plant row that has fill time but no ssboe', () => {
    const { ssboe: _ssboe, ...rest } = upstream
    const noSsboe = { ...rest, ssboe: undefined, fillTime: '15:07:03' }
    const prepared = prepareRithmicProtocolFills([manual, noSsboe])
    expect(prepared.fills.map((row) => row.fillId)).toEqual(['88421'])
  })

  it('does not retire a manual fill against the same clock one day later', () => {
    const shifted = markFillSource(
      [
        fill({
          fillId: '88421',
          fillSize: 2,
          fillPrice: 5810.25,
          fillDate: '20260926',
          fillTime: '15:07:00',
          ssboe: 0,
        }),
      ],
      'history',
    )[0]
    const prepared = prepareRithmicProtocolFills([manual, shifted])
    expect(prepared.retirements).toEqual([])
    expect(prepared.fills.some((row) => row.fillId === 'manual-gap')).toBe(true)
    expect(prepared.nearMisses.map((miss) => miss.reason)).toEqual(['day-offset'])
    expect(omitAmbiguousManualBooks(prepared.fills, prepared.nearMisses)).toEqual([])
  })

  it('keeps a manual fill on a quantity near-miss and logs a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const prepared = prepareRithmicProtocolFills([manual, nearbyOneLot])
      const sizes = prepared.fills.map((row) => row.fillSize).sort((a, b) => a - b)
      expect(sizes).toEqual([1, 2])
      expect(prepared.fills.find((row) => row.source === 'manual')?.fillId).toBe(
        'manual-gap',
      )
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('reason=qty'))
    } finally {
      warn.mockRestore()
    }
  })

  it('keeps a manual fill on a price near-miss and logs a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const otherPrice = { ...upstream, fillPrice: 5810.5 }
      const prepared = prepareRithmicProtocolFills([manual, otherPrice])
      expect(prepared.fills.map((row) => row.fillId).sort()).toEqual(['88421', 'manual-gap'])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('reason=price'))
      expect(prepared.nearMisses.map((miss) => miss.reason)).toEqual(['price'])
      expect(omitAmbiguousManualBooks(prepared.fills, prepared.nearMisses)).toEqual([])
    } finally {
      warn.mockRestore()
    }
  })

  it('does not derive a symbol when the operator timestamp is only minute-rounded', () => {
    const later = { ...upstream, ssboe: (manual.ssboe ?? 0) + 45 }
    const prepared = prepareRithmicProtocolFills([manual, later])
    expect(prepared.nearMisses.map((miss) => miss.reason)).toEqual(['clock'])
    expect(omitAmbiguousManualBooks(prepared.fills, prepared.nearMisses)).toEqual([])
  })

  it('does not derive a symbol when replay pieces are more than 2s apart', () => {
    const pieceA = markFillSource(
      [
        fill({
          fillId: '9200',
          fillSize: 1,
          fillPrice: 5810.25,
          fillDate: '20260925',
          ssboe: atMs / 1000,
          source: 'replay',
        }),
      ],
      'replay',
    )[0]
    const pieceB = {
      ...pieceA,
      fillId: '9201',
      ssboe: atMs / 1000 + 3,
    }
    const prepared = prepareRithmicProtocolFills([manual, pieceA, pieceB])
    expect(prepared.fills.filter((row) => row.source === 'manual')).toHaveLength(1)
    expect(prepared.nearMisses.some((miss) => miss.reason.includes('qty'))).toBe(true)
    expect(omitAmbiguousManualBooks(prepared.fills, prepared.nearMisses)).toEqual([])
  })

  it('does not derive a symbol when the plant row has neither ssboe nor fillTime', () => {
    const midnight = markFillSource(
      [
        fill({
          fillId: '9300',
          fillSize: 2,
          fillPrice: 5810.25,
          fillDate: '20260925',
          ssboe: 0,
        }),
      ],
      'history',
    )[0]
    const { fillTime: _fillTime, ...noClock } = { ...midnight, fillTime: undefined }
    const prepared = prepareRithmicProtocolFills([manual, noClock])
    expect(prepared.nearMisses.map((miss) => miss.reason)).toEqual(['no-clock'])
    expect(omitAmbiguousManualBooks(prepared.fills, prepared.nearMisses)).toEqual([])
  })

  it('warns until every near-miss plant fill is confirmed distinct', () => {
    const first = { ...nearbyOneLot, fillId: '1403850' }
    const second = {
      ...nearbyOneLot,
      fillId: '1402237',
      fillPrice: 5810.5,
      ssboe: atMs / 1000 + 40,
    }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const none = prepareRithmicProtocolFills([manual, first, second])
      expect(none.nearMisses.map((miss) => miss.upstream.fillId)).toEqual(['1403850'])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('upstream fillId=1403850'))

      warn.mockClear()
      const one = prepareRithmicProtocolFills([
        { ...manual, confirmedDistinctFillIds: ['1403850'] },
        first,
        second,
      ])
      expect(one.nearMisses.map((miss) => miss.upstream.fillId)).toEqual(['1402237'])
      expect(one.retirements).toEqual([])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('upstream fillId=1402237'))

      warn.mockClear()
      const both = prepareRithmicProtocolFills([
        { ...manual, confirmedDistinctFillIds: ['1403850', '1402237'] },
        first,
        second,
      ])
      expect(both.nearMisses).toEqual([])
      expect(both.retirements).toEqual([])
      expect(both.fills.map((row) => row.fillId).sort()).toEqual([
        '1402237',
        '1403850',
        'manual-gap',
      ])
      expect(warn).not.toHaveBeenCalled()

      const legacyAndList = prepareRithmicProtocolFills([
        {
          ...manual,
          confirmedDistinctFillId: '1402237',
          confirmedDistinctFillIds: ['1403850'],
        },
        first,
        second,
      ])
      expect(legacyAndList.nearMisses).toEqual([])
    } finally {
      warn.mockRestore()
    }
  })

  it('classifies a farther near-miss as a near-miss, not as unrelated', () => {
    const first = { ...nearbyOneLot, fillId: '1403850' }
    const second = {
      ...nearbyOneLot,
      fillId: '1402237',
      fillPrice: 5810.5,
      ssboe: atMs / 1000 + 40,
    }
    const book = [manual, first, second]
    expect(manualFillBookRelation(book, 'manual-gap', first)).toMatchObject({
      kind: 'near-miss',
      orderFillId: '1403850',
    })
    expect(manualFillBookRelation(book, 'manual-gap', second)).toMatchObject({
      kind: 'near-miss',
      orderFillId: '1402237',
    })
  })

  it('keeps a plant fill that was confirmed distinct from the manual', () => {
    const marked = { ...manual, confirmedDistinctFillId: '88422' }
    const qty = prepareRithmicProtocolFills([marked, nearbyOneLot])
    expect(qty.nearMisses).toEqual([])
    expect(qty.retirements).toEqual([])
    expect(qty.fills.map((row) => row.fillId).sort()).toEqual(['88422', 'manual-gap'])

    const otherPlant = prepareRithmicProtocolFills([
      { ...manual, confirmedDistinctFillId: '9999' },
      nearbyOneLot,
    ])
    expect(otherPlant.nearMisses.map((miss) => miss.reason)).toEqual(['qty'])

    const nextDay = markFillSource(
      [
        fill({
          fillId: '88430',
          fillSize: 2,
          fillPrice: 5810.25,
          fillDate: '20260926',
          fillTime: '15:07:00',
          ssboe: 0,
        }),
      ],
      'history',
    )[0]
    const day = prepareRithmicProtocolFills([
      { ...manual, confirmedDistinctFillId: '88430' },
      nextDay,
    ])
    expect(day.nearMisses).toEqual([])
    expect(day.retirements).toEqual([])
    expect(day.fills.map((row) => row.fillId).sort()).toEqual(['88430', 'manual-gap'])

    const midnight = markFillSource(
      [
        fill({
          fillId: '9300',
          fillSize: 2,
          fillPrice: 5810.25,
          fillDate: '20260925',
          ssboe: 0,
        }),
      ],
      'history',
    )[0]
    const clockless = prepareRithmicProtocolFills([
      { ...manual, confirmedDistinctFillId: '9300' },
      { ...midnight, fillTime: undefined },
    ])
    expect(clockless.nearMisses).toEqual([])
    expect(clockless.retirements).toEqual([])
    expect(clockless.fills.map((row) => row.fillId).sort()).toEqual(['9300', 'manual-gap'])
  })

  it('ignores a retired manual fill in reconcile and FIFO', () => {
    const retired = { ...manual, source: 'manual-retired' as const }
    const prepared = prepareRithmicProtocolFills([retired, upstream])
    expect(prepared.fills.map((row) => row.fillId)).toEqual(['88421'])
    expect(prepared.retirements).toEqual([])
    expect(prepared.nearMisses).toEqual([])
  })

  it('does not treat a clockless plant fill more than a day away as a near-miss', () => {
    const distant = markFillSource(
      [
        fill({
          fillId: '9400',
          fillSize: 2,
          fillPrice: 5810.25,
          fillDate: '20260920',
          ssboe: 0,
        }),
      ],
      'history',
    )[0]
    const prepared = prepareRithmicProtocolFills([
      manual,
      { ...distant, fillTime: undefined },
    ])
    expect(prepared.nearMisses).toEqual([])
    expect(prepared.fills.map((row) => row.fillId).sort()).toEqual(['9400', 'manual-gap'])
  })

  it('keeps a clockless plant fill on the next trade date and ignores one two days away', () => {
    const nextDay = markFillSource(
      [
        fill({
          fillId: '9401',
          fillSize: 2,
          fillPrice: 5810.25,
          fillDate: '20260926',
          ssboe: 0,
        }),
      ],
      'history',
    )[0]
    const adjacent = prepareRithmicProtocolFills([
      manual,
      { ...nextDay, fillTime: undefined },
    ])
    expect(adjacent.nearMisses.map((miss) => miss.reason)).toEqual(['no-clock'])
    expect(adjacent.retirements).toEqual([])
    const twoDays = { ...nextDay, fillId: '9402', fillDate: '20260927' }
    const distant = prepareRithmicProtocolFills([
      manual,
      { ...twoDays, fillTime: undefined },
    ])
    expect(distant.nearMisses).toEqual([])
    expect(distant.fills.map((row) => row.fillId).sort()).toEqual(['9402', 'manual-gap'])
  })

  it('skips only the near-miss book and records the sync wiring', () => {
    const other = markFillSource(
      [
        fill({
          fillId: '7001',
          symbol: 'MESH7',
          fillSize: 1,
          fillPrice: 7000,
          fillDate: '20260925',
          ssboe: atMs / 1000,
        }),
      ],
      'history',
    )[0]
    const later = { ...upstream, ssboe: (manual.ssboe ?? 0) + 45 }
    const prepared = prepareRithmicProtocolFills([manual, later, other])
    const plan = planManualFillSyncEffects(prepared)
    expect(plan.fifoFills.map((row) => row.fillId)).toEqual(['7001'])
    expect(plan.droppedByReason.manual_fill_ambiguous).toBe(2)
    expect(plan.retainAccountNumbers).toEqual([ACCOUNT])
  })

  it('matches a 10s clock gap and warns when the gap is past 30s but still close', () => {
    const within = { ...upstream, ssboe: (manual.ssboe ?? 0) + 10 }
    expect(prepareRithmicProtocolFills([manual, within]).fills.map((row) => row.fillId)).toEqual([
      '88421',
    ])
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const later = { ...upstream, ssboe: (manual.ssboe ?? 0) + 45 }
      const prepared = prepareRithmicProtocolFills([manual, later])
      expect(prepared.fills.map((row) => row.fillId).sort()).toEqual(['88421', 'manual-gap'])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('reason=clock'))
    } finally {
      warn.mockRestore()
    }
  })

  it('lets one upstream fill retire only one manual', () => {
    const second = { ...manual, fillId: 'manual-gap-2', ssboe: (manual.ssboe ?? 0) + 1 }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    try {
      const prepared = prepareRithmicProtocolFills([manual, second, upstream])
      const manuals = prepared.fills.filter((row) => row.source === 'manual')
      expect(manuals).toHaveLength(1)
      expect(prepared.fills.some((row) => row.fillId === '88421')).toBe(true)
      expect(info).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('already-matched'))
    } finally {
      warn.mockRestore()
      info.mockRestore()
    }
  })
})

describe('ordinary sync after a manual fill is superseded', () => {
  it('rematches an annotated manual-id trade onto one row and keeps the note', () => {
    const atMs = Date.parse('2026-09-25T15:07:00Z')
    const manual = markFillSource(
      [
        fill({
          fillId: 'manual-gap',
          fillSize: 1,
          fillPrice: 7800,
          fillDate: '20260925',
          ssboe: atMs / 1000,
        }),
      ],
      'manual',
    )[0]
    const close = markFillSource(
      [
        fill({
          fillId: '1002',
          transactionType: 'SELL',
          fillPrice: 7801,
          fillDate: '20260925',
          ssboe: atMs / 1000 + 60,
        }),
      ],
      'history',
    )[0]
    const upstream = markFillSource(
      [
        fill({
          fillId: '88421',
          fillSize: 1,
          fillPrice: 7800,
          fillDate: '20260925',
          ssboe: atMs / 1000 + 4,
        }),
      ],
      'history',
    )[0]
    const before = buildTradesFromRithmicFills(
      deriveTradesFromFillLedger([manual, close], []).fills,
      'u1',
      tickBySymbol,
    ).trades
    expect(before).toHaveLength(1)
    const existing = [
      {
        ...before[0],
        id: 'stored-manual-trade',
        tags: [RITHMIC_PROTOCOL_TRADE_TAG],
        comment: 'kept note',
      },
    ]
    const prepared = deriveTradesFromFillLedger([manual, close], [upstream, close])
    expect(prepared.fills.map((row) => row.fillId).sort()).toEqual(['1002', '88421'])
    const after = buildTradesFromRithmicFills(prepared.fills, 'u1', tickBySymbol).trades
    expect(after).toHaveLength(1)
    expect(after[0]?.entryId).toBe('88421')
    expect(after[0]?.pnl).toBe(existing[0]?.pnl)
    expect(manualTradeReplacedByPlantTrade(existing[0], after[0])).toBe(true)
    expect(
      classifyStoredProtocolTrade(existing[0], {
        derived: after,
        // Manual id is absent, so keeping the row depends on the replaced branch.
        ledgerFillIds: canonicalLedgerFillIds([close, upstream]),
      }),
    ).toBe('rematch')
    expect(resolvePersistedProtocolTradeId(after[0], existing)).toBe('stored-manual-trade')

    const takenOver = [{ ...after[0], id: 'stored-manual-trade', comment: existing[0].comment }]
    const { kept, skipped } = filterRithmicProtocolTradesCoveredByStoredRows(takenOver, existing)
    expect(skipped).toEqual([])
    expect(kept).toHaveLength(1)
    const phantoms = phantomProtocolTradeIds({
      existing,
      derived: after,
      ledgerFillIds: canonicalLedgerFillIds([close, upstream]),
    })
    expect(phantoms).toEqual([])
    expect(kept).toHaveLength(1)
    expect(kept[0]?.comment).toBe('kept note')
    expect(kept[0]?.pnl).toBe(existing[0]?.pnl)
  })
})

describe('confirm-distinct does not replace the manual trade', () => {
  const stored = {
    id: 'stored-manual-trade',
    accountNumber: ACCOUNT,
    instrument: 'MES',
    side: 'Long',
    quantity: 2,
    entryPrice: '7800',
    closePrice: '7801',
    entryDate: '2026-09-25T15:07:45.000Z',
    closeDate: '2026-09-25T15:09:00.000Z',
    entryId: 'manual-gap',
    closeId: '1002',
    tags: [RITHMIC_PROTOCOL_TRADE_TAG],
  }
  const plantTrade = {
    id: 'plant-trade',
    accountNumber: ACCOUNT,
    instrument: 'MES',
    side: 'Long',
    quantity: 2,
    entryPrice: '7800',
    closePrice: '7801',
    entryDate: '2026-09-25T15:07:00.000Z',
    closeDate: '2026-09-25T15:09:00.000Z',
    entryId: '88421',
    closeId: '1002',
  }
  const manualTrade = {
    ...plantTrade,
    id: 'manual-trade',
    entryId: 'manual-gap',
    entryDate: stored.entryDate,
  }

  it('is not a rematch when the batch still has the manual leg or the plant fill is marked distinct', () => {
    expect(
      manualTradeReplacedByPlantTrade(stored, plantTrade, {
        derivedBatch: [plantTrade, manualTrade],
      }),
    ).toBe(false)
    expect(
      manualTradeReplacedByPlantTrade(stored, plantTrade, {
        distinctPlantIdByManualFillId: new Map([['manual-gap', '88421']]),
      }),
    ).toBe(false)
    expect(
      classifyStoredProtocolTrade(stored, {
        derived: [plantTrade],
        ledgerFillIds: new Set(['manual-gap', '1002', '88421']),
        distinctPlantIdByManualFillId: new Map([['manual-gap', '88421']]),
      }),
    ).toBe('reap')
  })

  it('treats every id on the list as a different execution', () => {
    const otherPlant = {
      ...plantTrade,
      id: 'plant-b',
      entryId: '1402237',
      entryDate: '2026-09-25T15:07:20.000Z',
    }
    const both = new Map<string, ReadonlySet<string>>([
      ['manual-gap', new Set(['88421', '1402237'])],
    ])
    expect(
      manualTradeReplacedByPlantTrade(stored, plantTrade, {
        distinctPlantIdByManualFillId: both,
      }),
    ).toBe(false)
    expect(
      manualTradeReplacedByPlantTrade(stored, otherPlant, {
        distinctPlantIdByManualFillId: both,
      }),
    ).toBe(false)
    expect(
      manualTradeReplacedByPlantTrade(stored, otherPlant, {
        distinctPlantIdByManualFillId: new Map([['manual-gap', '88421']]),
      }),
    ).toBe(true)
    expect(
      manualTradeReplacedByPlantTrade(stored, plantTrade, {
        distinctPlantIdByManualFillId: new Map([['manual-gap', '88421']]),
      }),
    ).toBe(false)
  })

  it('still rematches when only one of two manual legs is replaced', () => {
    const both = {
      ...stored,
      id: 'both-manual',
      entryId: 'manual-a',
      closeId: 'manual-b',
      quantity: 1,
      entryPrice: '7800',
      closePrice: '7801',
      entryDate: '2026-09-25T15:07:00.000Z',
      closeDate: '2026-09-25T15:08:00.000Z',
      comment: 'kept note',
    }
    const replacedEntry = {
      ...both,
      id: 'plant-one-leg',
      entryId: '88421',
      entryDate: '2026-09-25T15:07:04.000Z',
    }
    expect(
      manualTradeReplacedByPlantTrade(both, replacedEntry, {
        derivedBatch: [replacedEntry],
      }),
    ).toBe(true)
    expect(
      classifyStoredProtocolTrade(both, {
        derived: [replacedEntry],
        ledgerFillIds: new Set(['manual-a', 'manual-b', '88421']),
      }),
    ).toBe('rematch')
  })
})
