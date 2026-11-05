import { describe, expect, it } from 'vitest'
import { RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
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
  shouldReplaceStoredFill,
  trimPreWindowOpeningCovers,
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

describe('pre-window opening covers (2-contract MESZ6 imbalance)', () => {
  // Pattern only — no production fill ids. A 2-lot MES long opened before
  // the ShowFillHistory window; the ledger starts on the covering sells
  // (328 buys vs 330 sells at scale). FIFO from flat then carries a 2-lot
  // short and pairs it with later-session buys (multi-day phantom shorts).
  const preWindowCovers = markFillSource(
    [
      fill({
        fillId: 'cover-1',
        fillDate: '20260930',
        transactionType: 'SELL',
        fillPrice: 7802,
        fillSize: 1,
        ssboe: at('2026-09-30T13:50:00Z'),
      }),
      fill({
        fillId: 'cover-2',
        fillDate: '20260930',
        transactionType: 'SELL',
        fillPrice: 7802.25,
        fillSize: 1,
        ssboe: at('2026-09-30T13:50:01Z'),
      }),
    ],
    'history',
  )
  const sameDayLong = [day1Buy, day1Sell]
  const nextDayLong = [day3Buy, day3Sell]
  const imbalanced = [...preWindowCovers, ...sameDayLong, ...nextDayLong]

  function signedNet(rows: RithmicProtocolFill[]) {
    return rows.reduce((sum, row) => {
      const qty = Math.abs(Number(row.fillSize) || 0)
      return sum + (row.transactionType === 'BUY' ? qty : -qty)
    }, 0)
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

  it('raw ledger is two sells heavy and FIFO invents an overnight short', () => {
    expect(signedNet(imbalanced)).toBe(-2)
    const { trades, openSkipped } = buildTradesFromRithmicFills(
      imbalanced,
      'u1',
      tickBySymbol,
    )
    expect(openSkipped).toBe(2)
    expect(overnightShorts(trades).length).toBeGreaterThan(0)
  })

  it('trims only the leading extra sells, not a later live short', () => {
    const { fills, trimmed } = trimPreWindowOpeningCovers(imbalanced)
    expect(trimmed).toEqual([
      {
        accountId: ACCOUNT,
        instrument: 'MES',
        side: 'S',
        quantity: 2,
      },
    ])
    expect(signedNet(fills)).toBe(0)
    expect(fills.map((row) => row.fillId)).toEqual([
      '1001',
      '1002',
      '2001',
      '2002',
    ])
  })

  it('prepare + FIFO then delete+resync from the same fills stays same-day', () => {
    const prepared = prepareRithmicProtocolFills(imbalanced)
    expect(prepared.stats.dropped.pre_window_covers).toBe(2)
    const first = buildTradesFromRithmicFills(
      prepared.fills,
      'u1',
      tickBySymbol,
    )
    const again = buildTradesFromRithmicFills(
      prepared.fills,
      'u1',
      tickBySymbol,
    )
    expect(first.openSkipped).toBe(0)
    expect(overnightShorts(first.trades)).toEqual([])
    expect(overnightCount(first.trades)).toBe(0)
    expect(first.trades).toHaveLength(2)
    expect(first.trades.map((trade) => [trade.side, trade.entryId, trade.closeId])).toEqual([
      ['Short', '1002', '1001'],
      ['Long', '2001', '2002'],
    ])
    expect(again.trades.map((trade) => [trade.entryId, trade.closeId])).toEqual(
      first.trades.map((trade) => [trade.entryId, trade.closeId]),
    )
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
    const { fills, trimmed } = trimPreWindowOpeningCovers(liveShort)
    expect(trimmed).toEqual([])
    expect(fills).toHaveLength(3)
    const { openSkipped, trades } = buildTradesFromRithmicFills(
      fills,
      'u1',
      tickBySymbol,
    )
    expect(openSkipped).toBe(2)
    expect(overnightShorts(trades)).toEqual([])
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
    expect(prepared.stats.dropped.pre_window_covers).toBeUndefined()
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
})
