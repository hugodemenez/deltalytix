import { describe, expect, it } from 'vitest'
import { buildTradesFromRithmicFills } from './fills-to-trades'
import {
  consolidateOrderFills,
  dedupeFills,
  filterRithmicProtocolTradesCoveredByStoredRows,
  markFillSource,
  preferHistoryFills,
} from './dedupe-fills'
import type { RithmicProtocolFill } from './types'

const ACCOUNT = 'LFE050-I7X0S9B3-TEST001'
const tickBySymbol = new Map([['MES', { tickSize: 0.25, tickValue: 1.25 }]])
const at = (iso: string) => Date.parse(iso) / 1000

function fill(o: Partial<RithmicProtocolFill> & { ssboe: number }): RithmicProtocolFill {
  return {
    accountId: ACCOUNT,
    symbol: 'MESZ6',
    transactionType: 'SELL',
    fillPrice: 7761,
    fillSize: 1,
    ...o,
  }
}

/** Lucid Sep 30 13:57:21 UTC: a 5-lot short sold in four pieces, bought back as one 5-lot. */
const replayPieces = markFillSource(
  [
    fill({ fillId: '1245660', ssboe: at('2026-09-30T13:57:21Z') }),
    fill({ fillId: '1245661', ssboe: at('2026-09-30T13:57:21Z') }),
    fill({ fillId: '1245662', ssboe: at('2026-09-30T13:57:21Z') }),
    fill({ fillId: '1245663', fillSize: 2, ssboe: at('2026-09-30T13:57:22Z') }),
    fill({
      fillId: '1246380',
      transactionType: '1',
      fillPrice: 7764.75,
      fillSize: 5,
      ssboe: at('2026-09-30T13:59:42Z'),
    }),
  ],
  'replay',
)

/** History rolls the sell up under the last piece id with the order's total size. */
const historyFills = markFillSource(
  [
    fill({ fillId: '1245663', fillSize: 5, fillDate: '20260930', ssboe: at('2026-09-30T13:57:21Z') }),
    fill({
      fillId: '1246380',
      transactionType: 'BUY',
      fillPrice: 7764.75,
      fillSize: 5,
      fillDate: '20260930',
      ssboe: at('2026-09-30T13:59:40Z'),
    }),
  ],
  'history',
)

function pipeline(fills: RithmicProtocolFill[]) {
  const cleaned = consolidateOrderFills(dedupeFills(preferHistoryFills(fills)))
  return { cleaned, ...buildTradesFromRithmicFills(cleaned, 'u1', tickBySymbol) }
}

function netContracts(fills: RithmicProtocolFill[]) {
  return fills.reduce(
    (sum, f) =>
      sum + (f.transactionType === 'BUY' || f.transactionType === '1' ? 1 : -1) * f.fillSize,
    0,
  )
}

describe('Rithmic split order pieces (Lucid Sep 30)', () => {
  it('history + replay pieces: one 5-lot short, day nets flat, nothing left open', () => {
    // Replay pieces stamped after history's newest fill survive
    // preferHistoryFills; consolidation alone must drop them.
    const lateReplay = replayPieces
      .slice(0, 4)
      .map((f) => ({ ...f, ssboe: (f.ssboe ?? 0) + 150 }))
    const { cleaned, trades, openSkipped } = pipeline([
      ...historyFills,
      ...replayPieces,
      ...lateReplay,
    ])
    expect(netContracts(cleaned)).toBe(0)
    expect(openSkipped).toBe(0)
    expect(trades).toHaveLength(1)
    expect(trades[0]).toMatchObject({
      side: 'Short',
      quantity: 5,
      entryId: '1245663',
      closeId: '1246380',
    })
    expect(trades[0].pnl).toBeCloseTo(-93.75)
  })

  it('replay only: pieces merge into one fill with summed size and the largest id', () => {
    const merged = consolidateOrderFills(replayPieces)
    const sell = merged.find((f) => f.transactionType === 'SELL')
    expect(sell).toMatchObject({ fillId: '1245663', fillSize: 5 })
    const { trades, openSkipped } = buildTradesFromRithmicFills(merged, 'u1', tickBySymbol)
    expect(openSkipped).toBe(0)
    expect(trades.map((t) => t.quantity)).toEqual([5])
  })

  it('does not merge same-price orders minutes apart', () => {
    const a = fill({ fillId: '1', ssboe: at('2026-09-30T13:57:21Z') })
    const b = fill({ fillId: '2', ssboe: at('2026-09-30T14:10:00Z') })
    expect(consolidateOrderFills(markFillSource([a, b], 'replay'))).toHaveLength(2)
  })
})

/** Rows rebuilt from the trader's ATAS export: the 5-lot stored as four ATAS pieces. */
const rebuiltRows = [
  { q: 1, entryId: '1245660' },
  { q: 1, entryId: '1245661' },
  { q: 1, entryId: '1245662' },
  { q: 2, entryId: '1245663' },
].map((r, i) => ({
  id: `rebuilt-${i}`,
  accountNumber: ACCOUNT,
  instrument: 'MES',
  side: 'Short',
  quantity: r.q,
  entryPrice: '7761',
  closePrice: '7764.75',
  entryDate: '2026-09-30T13:57:21.000+00:00',
  closeDate: '2026-09-30T13:59:40.000+00:00',
  entryId: r.entryId,
  closeId: '1246380',
}))

describe('sync over rows rebuilt from a broker export', () => {
  const incoming = () =>
    pipeline([...historyFills, ...replayPieces]).trades.map((t) => ({
      ...t,
      accountNumber: ACCOUNT,
    }))

  it('inserts nothing when the stored rows already cover the contracts', () => {
    const { kept, skipped } = filterRithmicProtocolTradesCoveredByStoredRows(
      incoming(),
      rebuiltRows,
    )
    expect(kept).toHaveLength(0)
    expect(skipped).toHaveLength(1)
  })

  it('still inserts contracts the stored rows do not cover', () => {
    const { kept } = filterRithmicProtocolTradesCoveredByStoredRows(
      incoming(),
      rebuiltRows.slice(1),
    )
    expect(kept).toHaveLength(1)
  })

  it('a different price is a different trade', () => {
    const moved = incoming().map((t) => ({ ...t, closePrice: '7765' }))
    expect(filterRithmicProtocolTradesCoveredByStoredRows(moved, rebuiltRows).kept).toHaveLength(1)
  })
})
