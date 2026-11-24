import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  cmeTradeDateFromMs,
  consolidateOrderFills,
  fillTradeDateKey,
  markFillSource,
  preferHistoryFills,
  preferHistoryFillsWithDecisions,
  sessionCarryOvers,
} from './dedupe-fills'
import { prepareRithmicProtocolFills } from './fill-ledger'
import { buildTradesFromRithmicFills } from './fills-to-trades'
import type { RithmicProtocolFill } from './types'

const tickBySymbol = new Map([['MNQ', { tickSize: 0.25, tickValue: 0.5 }]])

const fixture = JSON.parse(
  readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      'fixtures/lucid-micka-rollup-fills.json',
    ),
    'utf8',
  ),
) as { fills: RithmicProtocolFill[] }

const rollup = fixture.fills.find((row) => row.source === 'history')!
const live = fixture.fills.filter((row) => row.source === 'replay')

function trades(fills: RithmicProtocolFill[]) {
  const prepared = prepareRithmicProtocolFills(fills).fills
  const built = buildTradesFromRithmicFills(prepared, 'u1', tickBySymbol)
  return {
    ...built,
    pnl: built.trades.reduce((sum, trade) => sum + trade.pnl, 0),
  }
}

describe('order-history rollup next to live executions (LFF050 Nov 16–20)', () => {
  it('fixture holds 60 live executions and one order-history rollup', () => {
    expect(live).toHaveLength(60)
    expect(rollup).toMatchObject({ fillId: '1232782', fillSize: 2, fillPrice: 26830.5 })
  })

  it('a single history rollup does not drop the live fills around it', () => {
    const { fills, decisions } = preferHistoryFillsWithDecisions(fixture.fills)
    expect(fills).toHaveLength(60)
    expect(fills.every((row) => row.source === 'replay')).toBe(true)
    expect(decisions).toEqual([
      expect.objectContaining({
        tradeDate: '20261117',
        basketId: '291322356',
        historyFills: 1,
        liveFills: 2,
        kept: 'live',
      }),
    ])
  })

  it('matches the broker trades report: 30 round trips, +610.00, flat', () => {
    const result = trades(fixture.fills)
    expect(result.openSkipped).toBe(0)
    expect(result.trades).toHaveLength(30)
    expect(result.pnl).toBeCloseTo(610, 10)
    expect(result.trades.every((trade) => trade.instrument === 'MNQ')).toBe(true)
  })

  it('ends every trade date flat — no session carry', () => {
    expect(sessionCarryOvers(preferHistoryFills(fixture.fills))).toEqual([])
  })

  it('the old coverage rule left a phantom short (regression guard)', () => {
    // What the ±1-day coverage rule produced: drop every live fill on
    // Nov 16–17 up to the rollup, keep the rollup.
    const rollupMs = rollup.ssboe! * 1000
    const oldRule = fixture.fills.filter(
      (row) =>
        row.source === 'history' ||
        !['20261116', '20261117'].includes(row.fillDate ?? '') ||
        row.ssboe! * 1000 > rollupMs + 2 * 60 * 1000,
    )
    const carries = sessionCarryOvers(oldRule)
    expect(carries.some((carry) => carry.net < 0)).toBe(true)
  })
})

describe('preferHistoryFills per order (basketId)', () => {
  const t = (iso: string) => Date.parse(iso) / 1000
  const row = (o: Partial<RithmicProtocolFill>): RithmicProtocolFill => ({
    accountId: 'ACC',
    symbol: 'MNQM6',
    fillDate: '20260330',
    fillSize: 1,
    ...o,
  } as RithmicProtocolFill)

  it('keeps split history pieces over a replay rollup of the same order (Bulenox Mar 30)', () => {
    const history = markFillSource(
      [
        row({ fillId: '1158191', transactionType: 'BUY', fillPrice: 23221.25, fillSize: 2, basketId: 'b1', ssboe: t('2026-03-30T17:16:32Z') }),
        row({ fillId: '1158332', transactionType: 'SELL', fillPrice: 23225, basketId: 'b2', ssboe: t('2026-03-30T17:16:46Z') }),
        row({ fillId: '1158333', transactionType: 'SELL', fillPrice: 23225.25, basketId: 'b2', ssboe: t('2026-03-30T17:16:46Z') }),
      ],
      'history',
    )
    const rollup = markFillSource(
      [row({ fillId: '1158333', transactionType: '2', fillPrice: 23225.25, fillSize: 2, basketId: 'b2', ssboe: t('2026-03-30T17:16:46Z') })],
      'replay',
    )
    const kept = preferHistoryFills([...history, ...rollup])
    expect(kept.map((fill) => `${fill.source}:${fill.fillId}`)).toEqual([
      'history:1158191',
      'history:1158332',
      'history:1158333',
    ])
  })

  it('never keeps a partial report of an order over the fuller one', () => {
    const history = markFillSource(
      [row({ fillId: '20', transactionType: 'BUY', fillPrice: 100, fillSize: 3, basketId: 'b9', ssboe: t('2026-03-30T15:00:00Z') })],
      'history',
    )
    const partial = markFillSource(
      [
        row({ fillId: '19', transactionType: '1', fillPrice: 100, basketId: 'b9', ssboe: t('2026-03-30T15:00:00Z') }),
        row({ fillId: '20', transactionType: '1', fillPrice: 100, basketId: 'b9', ssboe: t('2026-03-30T15:00:00Z') }),
      ],
      'replay',
    )
    expect(preferHistoryFills([...history, ...partial]).map((fill) => `${fill.source}:${fill.fillId}`)).toEqual(['history:20'])
  })

  it('keeps history on a tie and keeps orders only one source saw', () => {
    const history = markFillSource(
      [row({ fillId: '10', transactionType: 'BUY', fillPrice: 100, basketId: 'b1', ssboe: t('2026-03-30T15:00:00Z') })],
      'history',
    )
    const replay = markFillSource(
      [
        row({ fillId: '10', transactionType: '1', fillPrice: 100, basketId: 'b1', ssboe: t('2026-03-30T15:00:01Z') }),
        row({ fillId: '11', transactionType: '2', fillPrice: 101, basketId: 'b2', ssboe: t('2026-03-30T15:05:00Z') }),
      ],
      'replay',
    )
    const kept = preferHistoryFills([...history, ...replay])
    expect(kept.map((fill) => `${fill.source}:${fill.fillId}`)).toEqual(['history:10', 'replay:11'])
  })
})

describe('preferHistoryFills per trade date (rows without basketId)', () => {
  const base = {
    accountId: 'ACC',
    symbol: 'MNQZ6',
    fillSize: 1,
  }
  const t = (iso: string) => Date.parse(iso) / 1000

  it('keeps history on a trade date with no live fills', () => {
    const history = markFillSource(
      [
        { ...base, fillId: 'h1', transactionType: 'BUY', fillPrice: 100, fillDate: '20261110', ssboe: t('2026-11-10T15:00:00Z') },
        { ...base, fillId: 'h2', transactionType: 'SELL', fillPrice: 101, fillDate: '20261110', ssboe: t('2026-11-10T15:05:00Z') },
      ],
      'history',
    )
    const livePiece = markFillSource(
      [{ ...base, fillId: 'r1', transactionType: '1', fillPrice: 99, fillDate: '20261111', ssboe: t('2026-11-11T15:00:00Z') }],
      'replay',
    )
    const kept = preferHistoryFills([...history, ...livePiece]).map((row) => row.fillId)
    expect(kept).toEqual(['h1', 'h2', 'r1'])
  })

  it('backfills history before the first live fill when the replay window opens mid-session', () => {
    const history = markFillSource(
      [
        { ...base, fillId: 'h1', transactionType: 'BUY', fillPrice: 100, fillDate: '20261110', ssboe: t('2026-11-10T14:00:00Z') },
        { ...base, fillId: 'h2', transactionType: 'SELL', fillPrice: 101, fillDate: '20261110', ssboe: t('2026-11-10T14:05:00Z') },
        { ...base, fillId: 'h3', transactionType: 'BUY', fillPrice: 102, fillSize: 2, fillDate: '20261110', ssboe: t('2026-11-10T16:00:00Z') },
      ],
      'history',
    )
    const replay = markFillSource(
      [
        { ...base, fillId: 'r3', transactionType: '1', fillPrice: 102, fillDate: '20261110', ssboe: t('2026-11-10T16:00:01Z') },
        { ...base, fillId: 'r4', transactionType: '1', fillPrice: 102.25, fillDate: '20261110', ssboe: t('2026-11-10T16:00:01Z') },
      ],
      'replay',
    )
    const { fills, decisions } = preferHistoryFillsWithDecisions([...history, ...replay])
    expect(fills.map((row) => row.fillId)).toEqual(['h1', 'h2', 'r3', 'r4'])
    expect(decisions[0]).toMatchObject({ kept: 'live', historyBackfilled: 2 })
  })

  it('compares replay without fill_date on its CME trade date, not the UTC day', () => {
    // 23:30 UTC on Nov 9 is 17:30 CT — already the Nov 10 trade date.
    const history = markFillSource(
      [{ ...base, fillId: 'h1', transactionType: 'BUY', fillPrice: 100, fillDate: '20261110', ssboe: t('2026-11-09T23:30:00Z') }],
      'history',
    )
    const replay = markFillSource(
      [{ ...base, fillId: 'r1', transactionType: '1', fillPrice: 100, ssboe: t('2026-11-09T23:30:02Z') }],
      'replay',
    )
    expect(fillTradeDateKey(replay[0])).toBe('20261110')
    expect(preferHistoryFills([...history, ...replay]).map((row) => row.fillId)).toEqual(['h1'])
  })
})

describe('review fixes: one version per order, history never removes unrestated live fills', () => {
  const t = (iso: string) => Date.parse(iso) / 1000
  const h = (o: Partial<RithmicProtocolFill>): RithmicProtocolFill =>
    ({
      accountId: 'ACC',
      symbol: 'MNQZ6',
      transactionType: 'BUY',
      fillSize: 1,
      source: 'history',
      ...o,
    }) as RithmicProtocolFill
  const r = (o: Partial<RithmicProtocolFill>): RithmicProtocolFill =>
    h({ transactionType: '1', source: 'replay', ...o })
  const bought = (fills: RithmicProtocolFill[]) =>
    fills
      .filter((fill) => ['BUY', '1'].includes(String(fill.transactionType)))
      .reduce((sum, fill) => sum + Number(fill.fillSize), 0)
  const tags = (fills: RithmicProtocolFill[]) =>
    fills.map((fill) => `${fill.source}:${fill.fillId}x${fill.fillSize}@${fill.fillPrice}`)

  describe('consolidation respects basket ids (finding 1)', () => {
    // Order A: history rolled 10 + 11 into 11 ×2, live has the pieces → live
    // wins. Order B, 30s later at the same price, both sources agree → history.
    const fills = [
      h({ fillId: '11', fillPrice: 100, fillSize: 2, basketId: 'a', fillDate: '20261117', ssboe: t('2026-11-17T15:00:00Z') }),
      r({ fillId: '10', fillPrice: 100.25, basketId: 'a', fillDate: '20261117', ssboe: t('2026-11-17T15:00:00Z') }),
      r({ fillId: '11', fillPrice: 100, basketId: 'a', fillDate: '20261117', ssboe: t('2026-11-17T15:00:00Z') }),
      h({ fillId: '20', fillPrice: 100, basketId: 'b', fillDate: '20261117', ssboe: t('2026-11-17T15:00:30Z') }),
      r({ fillId: '20', fillPrice: 100, basketId: 'b', fillDate: '20261117', ssboe: t('2026-11-17T15:00:31Z') }),
    ]

    it('a history order does not swallow a different live order at the same price', () => {
      const prepared = prepareRithmicProtocolFills(fills).fills
      expect(bought(prepared)).toBe(3)
      expect(tags(prepared)).toEqual([
        'replay:10x1@100.25',
        'replay:11x1@100',
        'history:20x1@100',
      ])
    })

    it('still drops a replay twin that shares the basket or lacks one', () => {
      const history = [h({ fillId: '20', fillPrice: 100, basketId: 'b', ssboe: t('2026-11-17T15:00:30Z') })]
      expect(
        consolidateOrderFills([...history, r({ fillId: '20', fillPrice: 100, basketId: 'b', ssboe: t('2026-11-17T15:00:31Z') })]),
      ).toHaveLength(1)
      expect(
        consolidateOrderFills([...history, r({ fillId: '20', fillPrice: 100, ssboe: t('2026-11-17T15:00:31Z') })]),
      ).toHaveLength(1)
      expect(
        consolidateOrderFills([...history, r({ fillId: '11', fillPrice: 100, basketId: 'a', ssboe: t('2026-11-17T15:00:00Z') })]),
      ).toHaveLength(2)
    })
  })

  describe("a source's own rollup is collapsed before comparing (finding 2)", () => {
    const at = t('2026-11-17T15:00:00Z')
    const piece10 = { fillId: '10', fillPrice: 100.25, basketId: 'a', fillDate: '20261117', ssboe: at }
    const piece11 = { fillId: '11', fillPrice: 100, basketId: 'a', fillDate: '20261117', ssboe: at }
    const rollup11 = { fillId: '11', fillPrice: 100, fillSize: 2, basketId: 'a', fillDate: '20261117', ssboe: at }

    it('live bucket holds the order-history rollup and the ReplayExecutions pieces', () => {
      const fills = [h(rollup11), r(rollup11), r(piece10), r(piece11)]
      const { fills: kept, decisions } = preferHistoryFillsWithDecisions(fills)
      expect(tags(kept)).toEqual(['replay:10x1@100.25', 'replay:11x1@100'])
      expect(decisions).toEqual([
        expect.objectContaining({ basketId: 'a', kept: 'live', historyFills: 1, liveFills: 3 }),
      ])
      const prepared = prepareRithmicProtocolFills(fills).fills
      expect(bought(prepared)).toBe(2)
      expect(tags(prepared)).toEqual(['replay:10x1@100.25', 'replay:11x1@100'])
    })

    it('history bucket holds a stored rollup and later history pieces', () => {
      const fills = [h(rollup11), h(piece10), h(piece11), r(piece10), r(piece11)]
      const { fills: kept, decisions } = preferHistoryFillsWithDecisions(fills)
      expect(tags(kept)).toEqual(['history:10x1@100.25', 'history:11x1@100'])
      expect(decisions).toEqual([expect.objectContaining({ basketId: 'a', kept: 'history' })])
      expect(bought(prepareRithmicProtocolFills(fills).fills)).toBe(2)
    })

    it('collapses the rollup on an order only one source saw', () => {
      expect(bought(prepareRithmicProtocolFills([h(rollup11), h(piece10), h(piece11)]).fills)).toBe(2)
      expect(bought(prepareRithmicProtocolFills([r(rollup11), r(piece10), r(piece11)]).fills)).toBe(2)
    })

    it('identical re-deliveries do not inflate a source total', () => {
      // History 11 ×2 delivered twice still totals 2, not 4, so it ties the
      // two live pieces and the live pieces win on piece count.
      const fills = [h(rollup11), h(rollup11), r(piece10), r(piece11)]
      expect(tags(preferHistoryFills(fills))).toEqual(['replay:10x1@100.25', 'replay:11x1@100'])
    })

    it('does not treat a larger last piece as a rollup', () => {
      const fills = [
        h({ ...piece10 }),
        h({ ...piece11 }),
        h({ fillId: '12', fillPrice: 100, fillSize: 2, basketId: 'a', fillDate: '20261117', ssboe: at }),
      ]
      expect(preferHistoryFills(fills)).toHaveLength(3)
    })
  })

  it('routes a book-date with an unbasketed row through the per-date rule (finding 3)', () => {
    const at = t('2026-11-17T15:00:00Z')
    const fills = [
      h({ fillId: '11', fillPrice: 100, fillSize: 2, fillDate: '20261117', ssboe: at }),
      r({ fillId: '10', fillPrice: 100.25, basketId: 'a', fillDate: '20261117', ssboe: at }),
      r({ fillId: '11', fillPrice: 100, basketId: 'a', fillDate: '20261117', ssboe: at }),
    ]
    const { fills: kept, decisions } = preferHistoryFillsWithDecisions(fills)
    expect(tags(kept)).toEqual(['replay:10x1@100.25', 'replay:11x1@100'])
    expect(decisions).toEqual([
      expect.objectContaining({ tradeDate: '20261117', kept: 'live', historyBackfilled: 0 }),
    ])
    expect(decisions[0].basketId).toBeUndefined()
    expect(bought(prepareRithmicProtocolFills(fills).fills)).toBe(2)
  })

  describe('orders are keyed by basket, not trade date (finding 4)', () => {
    it('keeps one version of an order filled across the 16:00–17:00 CT break', () => {
      // 15:59:30 CT (trade date Nov 17) and 17:01 CT (trade date Nov 18).
      const fills = [
        h({ fillId: '11', fillPrice: 100, fillSize: 2, basketId: 'a', fillDate: '20261118', ssboe: t('2026-11-17T23:01:00Z') }),
        r({ fillId: '10', fillPrice: 100.25, basketId: 'a', ssboe: t('2026-11-17T21:59:30Z') }),
        r({ fillId: '11', fillPrice: 100, basketId: 'a', ssboe: t('2026-11-17T23:01:00Z') }),
      ]
      expect(fillTradeDateKey(fills[1])).toBe('20261117')
      expect(fillTradeDateKey(fills[2])).toBe('20261118')
      const { fills: kept, decisions } = preferHistoryFillsWithDecisions(fills)
      expect(tags(kept)).toEqual(['replay:10x1@100.25', 'replay:11x1@100'])
      expect(decisions).toEqual([
        expect.objectContaining({ basketId: 'a', kept: 'live', historyFills: 1, liveFills: 2 }),
      ])
      expect(bought(prepareRithmicProtocolFills(fills).fills)).toBe(2)
    })

    it('treats a basket id reused more than 72h later as a different order', () => {
      const fills = [
        h({ fillId: '5', fillPrice: 100, basketId: 'x', fillDate: '20261110', ssboe: t('2026-11-10T15:00:00Z') }),
        r({ fillId: '9', fillPrice: 200, basketId: 'x', fillDate: '20261116', ssboe: t('2026-11-16T15:00:00Z') }),
      ]
      const { fills: kept, decisions } = preferHistoryFillsWithDecisions(fills)
      expect(kept).toHaveLength(2)
      expect(decisions).toEqual([])
    })
  })

  describe('per-date rule keeps history quantity live did not see (finding 5)', () => {
    it('does not drop a history fill just because another live fill is nearby', () => {
      const history = [
        h({ fillId: 'h1', fillPrice: 100, fillDate: '20261117', ssboe: t('2026-11-17T16:00:00Z') }),
        h({ fillId: 'h2', fillPrice: 100, fillDate: '20261117', ssboe: t('2026-11-17T16:01:00Z') }),
        h({ fillId: 'h3', transactionType: 'SELL', fillPrice: 105, fillSize: 2, fillDate: '20261117', ssboe: t('2026-11-17T17:00:00Z') }),
      ]
      const live = [
        r({ fillId: 'r2', fillPrice: 100, fillDate: '20261117', ssboe: t('2026-11-17T16:01:00Z') }),
        // Not restated by history (price differs), so live wins the date.
        r({ fillId: 'r3', transactionType: '2', fillPrice: 105.25, fillSize: 2, fillDate: '20261117', ssboe: t('2026-11-17T17:00:00Z') }),
      ]
      const { fills: kept, decisions } = preferHistoryFillsWithDecisions([...history, ...live])
      expect(kept.map((fill) => fill.fillId)).toEqual(['h1', 'r2', 'r3'])
      expect(decisions).toEqual([expect.objectContaining({ kept: 'live', historyBackfilled: 1 })])
      expect(sessionCarryOvers(kept)).toEqual([])
    })

    it('keeps only the leftover quantity of a history fill live partly saw', () => {
      const fills = [
        h({ fillId: 'h1', fillPrice: 100, fillSize: 3, fillDate: '20261117', ssboe: t('2026-11-17T16:00:00Z') }),
        r({ fillId: 'r1', fillPrice: 100.25, fillDate: '20261117', ssboe: t('2026-11-17T16:00:01Z') }),
      ]
      const { fills: kept, decisions } = preferHistoryFillsWithDecisions(fills)
      // The leftover joins the live version, so it is tagged replay.
      expect(tags(kept)).toEqual(['replay:h1x2@100', 'replay:r1x1@100.25'])
      expect(decisions).toEqual([expect.objectContaining({ kept: 'live', historyBackfilled: 1 })])
      // The input row is not mutated.
      expect(fills[0].fillSize).toBe(3)
      expect(fills[0].source).toBe('history')
    })
  })

  describe('round 2: a backfilled history leftover cannot drop a live fill', () => {
    const t0 = t('2026-11-17T16:00:00Z')

    it('scenario A: no basket ids', () => {
      const fills = [
        h({ fillId: '12', fillPrice: 100, fillSize: 3, fillDate: '20261117', ssboe: t0 }),
        r({ fillId: '10', fillPrice: 100, fillDate: '20261117', ssboe: t0 }),
        // Not restated by history, so live wins the date.
        r({ fillId: '11', fillPrice: 101, fillDate: '20261117', ssboe: t0 + 30 }),
      ]
      const { decisions } = preferHistoryFillsWithDecisions(fills)
      expect(decisions).toEqual([expect.objectContaining({ kept: 'live', historyBackfilled: 1 })])
      const prepared = prepareRithmicProtocolFills(fills).fills
      expect(bought(prepared)).toBe(3)
      // The leftover ×1 sums with live 10 ×1 at 100 instead of replacing it.
      expect(tags(prepared)).toEqual(['replay:12x2@100', 'replay:11x1@101'])
    })

    it('scenario B: shared basket routed per date by an unbasketed row', () => {
      const fills = [
        h({ fillId: '12', fillPrice: 100, fillSize: 2, basketId: 'x', fillDate: '20261117', ssboe: t0 }),
        r({ fillId: '10', fillPrice: 100, basketId: 'x', fillDate: '20261117', ssboe: t0 }),
        r({ fillId: '30', transactionType: '2', fillPrice: 105, fillDate: '20261117', ssboe: t0 + 600 }),
      ]
      const prepared = prepareRithmicProtocolFills(fills).fills
      expect(bought(prepared)).toBe(2)
      expect(prepared.filter((fill) => fill.source === 'history')).toEqual([])
    })
  })

  describe('round 2: the per-date path collapses each source first', () => {
    const at = t('2026-11-17T15:00:00Z')
    const rollup11 = { fillId: '11', fillPrice: 100.5, fillSize: 2, fillDate: '20261117', ssboe: at }
    const piece11 = { fillId: '11', fillPrice: 100.5, fillDate: '20261117', ssboe: at }
    const piece10 = { fillId: '10', fillPrice: 100.75, fillDate: '20261117', ssboe: at }

    it('scenario A: an unbasketed live rollup next to its pieces, no history', () => {
      const fills = [r(rollup11), r(piece11), r(piece10)]
      expect(tags(preferHistoryFills(fills))).toEqual(['replay:11x1@100.5', 'replay:10x1@100.75'])
      expect(bought(prepareRithmicProtocolFills(fills).fills)).toBe(2)
    })

    it('scenario B: a history rollup delivered twice next to the live pieces', () => {
      const fills = [h(rollup11), h(rollup11), r(piece10), r(piece11)]
      const { fills: kept, decisions } = preferHistoryFillsWithDecisions(fills)
      expect(tags(kept)).toEqual(['replay:10x1@100.75', 'replay:11x1@100.5'])
      expect(decisions).toEqual([expect.objectContaining({ kept: 'live', historyBackfilled: 0 })])
      expect(bought(prepareRithmicProtocolFills(fills).fills)).toBe(2)
    })

    it('does not take another order that day for a rollup piece', () => {
      // 11 ×2 at 15:00 restates 10 + 11; the 5 ×1 at 14:00 is its own order.
      const fills = [
        r({ fillId: '5', fillPrice: 99, fillDate: '20261117', ssboe: at - 3600 }),
        r(rollup11),
        r(piece11),
      ]
      expect(bought(prepareRithmicProtocolFills(fills).fills)).toBe(3)
    })
  })

  describe('round 2: a rollup next to only part of its pieces (nit 3)', () => {
    const at = t('2026-11-17T15:00:00Z')
    const rollup11 = { fillId: '11', fillPrice: 100, fillSize: 2, basketId: 'a', fillDate: '20261117', ssboe: at }
    const piece11 = { fillId: '11', fillPrice: 100, basketId: 'a', fillDate: '20261117', ssboe: at }
    const piece10 = { fillId: '10', fillPrice: 100.25, basketId: 'a', fillDate: '20261117', ssboe: at }

    it('keeps the fuller rollup and drops the partial piece in one source', () => {
      const fills = [r(rollup11), r(piece11)]
      expect(tags(preferHistoryFills(fills))).toEqual(['replay:11x2@100'])
      expect(bought(prepareRithmicProtocolFills(fills).fills)).toBe(2)
    })

    it('the collapsed live version no longer outsizes history', () => {
      const fills = [h(piece10), h(piece11), r(rollup11), r(piece11)]
      const { fills: kept, decisions } = preferHistoryFillsWithDecisions(fills)
      expect(tags(kept)).toEqual(['history:10x1@100.25', 'history:11x1@100'])
      expect(decisions).toEqual([expect.objectContaining({ basketId: 'a', kept: 'history' })])
      expect(bought(prepareRithmicProtocolFills(fills).fills)).toBe(2)
    })
  })

  describe('round 2: different basket ids for one order across sources (nit 4)', () => {
    const at = t('2026-11-17T15:00:00Z')

    it('links the baskets through a shared fill id and keeps one version', () => {
      const fills = [
        h({ fillId: '10', fillPrice: 100.25, basketId: 'a', fillDate: '20261117', ssboe: at }),
        h({ fillId: '11', fillPrice: 100, basketId: 'a', fillDate: '20261117', ssboe: at }),
        r({ fillId: '11', fillPrice: 100, fillSize: 2, basketId: 'b', fillDate: '20261117', ssboe: at + 5 }),
      ]
      const { fills: kept, decisions } = preferHistoryFillsWithDecisions(fills)
      expect(tags(kept)).toEqual(['history:10x1@100.25', 'history:11x1@100'])
      expect(decisions).toEqual([expect.objectContaining({ basketId: 'a,b', kept: 'history' })])
      expect(bought(prepareRithmicProtocolFills(fills).fills)).toBe(2)
    })

    it('does not link a fill id recycled outside the tolerance', () => {
      const fills = [
        h({ fillId: '11', fillPrice: 100, basketId: 'a', fillDate: '20261117', ssboe: at }),
        r({ fillId: '11', fillPrice: 100, basketId: 'b', fillDate: '20261118', ssboe: at + 86400 }),
      ]
      const { fills: kept, decisions } = preferHistoryFillsWithDecisions(fills)
      expect(kept).toHaveLength(2)
      expect(decisions).toEqual([])
    })

    it('does not link baskets on opposite sides', () => {
      const fills = [
        h({ fillId: '11', fillPrice: 100, basketId: 'a', fillDate: '20261117', ssboe: at }),
        r({ fillId: '11', transactionType: '2', fillPrice: 100, basketId: 'b', fillDate: '20261117', ssboe: at }),
      ]
      expect(preferHistoryFillsWithDecisions(fills).decisions).toEqual([])
    })
  })

  describe('round 3: a resized leftover survives identity dedupe (finding 1)', () => {
    const t0 = t('2026-11-17T16:00:00Z')

    it('adds the leftover to the live piece it shares an identity with', () => {
      const fills = [
        h({ fillId: '11', fillPrice: 100, fillSize: 2, fillDate: '20261117', ssboe: t0 }),
        r({ fillId: '11', fillPrice: 100, fillDate: '20261117', ssboe: t0 }),
        // Not restated by history, so live wins the date.
        r({ fillId: '30', fillPrice: 101, fillDate: '20261117', ssboe: t0 + 300 }),
      ]
      const { decisions } = preferHistoryFillsWithDecisions(fills)
      expect(decisions).toEqual([expect.objectContaining({ kept: 'live', historyBackfilled: 1 })])
      const prepared = prepareRithmicProtocolFills(fills)
      expect(bought(prepared.fills)).toBe(3)
      expect(tags(prepared.fills)).toEqual(['replay:11x2@100', 'replay:30x1@101'])
      expect(prepared.stats.dropped).toEqual({})
      // Inputs are not mutated.
      expect(fills.map((fill) => `${fill.source}:${fill.fillSize}`)).toEqual([
        'history:2',
        'replay:1',
        'replay:1',
      ])
    })

    it('still drops a re-delivery of the live piece', () => {
      const fills = [
        h({ fillId: '11', fillPrice: 100, fillSize: 2, fillDate: '20261117', ssboe: t0 }),
        r({ fillId: '11', fillPrice: 100, fillDate: '20261117', ssboe: t0 }),
        r({ fillId: '11', fillPrice: 100, fillDate: '20261117', ssboe: t0 }),
        r({ fillId: '30', fillPrice: 101, fillDate: '20261117', ssboe: t0 + 300 }),
      ]
      const prepared = prepareRithmicProtocolFills(fills)
      expect(bought(prepared.fills)).toBe(3)
      expect(prepared.stats.dropped).toEqual({ duplicate_id: 1 })
    })
  })

  describe('round 3: the unbasketed collapse only looks at one order (finding 2)', () => {
    const at = t('2026-11-17T15:00:00Z')
    const other = { fillId: '8', fillPrice: 99, fillDate: '20261117', ssboe: at - 60 }
    const piece11 = { fillId: '11', fillPrice: 100, fillDate: '20261117', ssboe: at }

    it('keeps another order a minute earlier next to a larger rollup', () => {
      const fills = [r(other), r({ ...piece11, fillSize: 3 }), r(piece11)]
      const prepared = prepareRithmicProtocolFills(fills).fills
      expect(bought(prepared)).toBe(4)
      expect(tags(prepared)).toEqual(['replay:8x1@99', 'replay:11x3@100'])
    })

    it('does not let another order make a rollup look like the sum of its pieces', () => {
      const fills = [r(other), r({ ...piece11, fillSize: 2 }), r(piece11)]
      const prepared = prepareRithmicProtocolFills(fills).fills
      expect(bought(prepared)).toBe(3)
      expect(tags(prepared)).toEqual(['replay:8x1@99', 'replay:11x2@100'])
    })

    it('within the piece window, only drops rows sharing the rollup fill id', () => {
      const fills = [
        r({ fillId: '9', fillPrice: 99, fillDate: '20261117', ssboe: at }),
        r({ ...piece11, fillSize: 3 }),
        r(piece11),
      ]
      expect(tags(preferHistoryFills(fills))).toEqual(['replay:9x1@99', 'replay:11x3@100'])
    })
  })

  describe('round 4: an unbasketed equal-sum rollup needs a consecutive fill-id run', () => {
    const at = t('2026-11-17T15:00:00Z')
    const rollup11 = { fillId: '11', fillPrice: 100, fillSize: 2, fillDate: '20261117', ssboe: at }
    const piece11 = { fillId: '11', fillPrice: 100, fillDate: '20261117', ssboe: at }

    it('does not let another order in the same second fill the gap ({9, 11})', () => {
      const fills = [
        r({ fillId: '9', fillPrice: 99, fillDate: '20261117', ssboe: at }),
        r(rollup11),
        r(piece11),
      ]
      expect(tags(preferHistoryFills(fills))).toEqual(['replay:9x1@99', 'replay:11x2@100'])
      expect(bought(prepareRithmicProtocolFills(fills).fills)).toBe(3)
    })

    it('still collapses a rollup next to an unbroken run of its pieces ({10, 11})', () => {
      const fills = [
        r({ fillId: '10', fillPrice: 100.25, fillDate: '20261117', ssboe: at }),
        r(rollup11),
        r(piece11),
      ]
      expect(tags(preferHistoryFills(fills))).toEqual(['replay:10x1@100.25', 'replay:11x1@100'])
      expect(bought(prepareRithmicProtocolFills(fills).fills)).toBe(2)
    })

    it('keeps the rollup when another row has a non-numeric fill id', () => {
      const fills = [
        r({ fillId: 'abc', fillPrice: 99, fillDate: '20261117', ssboe: at }),
        r(rollup11),
        r(piece11),
      ]
      expect(tags(preferHistoryFills(fills))).toEqual(['replay:abcx1@99', 'replay:11x2@100'])
    })

    it('basketed rows still collapse on the equal sum alone', () => {
      const fills = [
        r({ fillId: '9', fillPrice: 99, basketId: 'a', fillDate: '20261117', ssboe: at }),
        r({ ...rollup11, basketId: 'a' }),
        r({ ...piece11, basketId: 'a' }),
      ]
      expect(tags(preferHistoryFills(fills))).toEqual(['replay:9x1@99', 'replay:11x1@100'])
    })
  })

  describe('round 5: an unbasketed rollup is compared with its contiguous fill-id run', () => {
    const at = t('2026-11-17T15:00:00Z')
    const piece10 = { fillId: '10', fillPrice: 100.25, fillDate: '20261117', ssboe: at }
    const rollup11 = { fillId: '11', fillPrice: 100, fillSize: 2, fillDate: '20261117', ssboe: at }
    const piece11 = { fillId: '11', fillPrice: 100, fillDate: '20261117', ssboe: at }

    it('ignores a lower id outside the run (8 next to 10, 11)', () => {
      const fills = [
        r({ fillId: '8', fillPrice: 99, fillDate: '20261117', ssboe: at }),
        r(piece10),
        r(rollup11),
        r(piece11),
      ]
      expect(tags(preferHistoryFills(fills))).toEqual([
        'replay:8x1@99',
        'replay:10x1@100.25',
        'replay:11x1@100',
      ])
      expect(bought(prepareRithmicProtocolFills(fills).fills)).toBe(3)
    })

    it('ignores a higher id in the piece window (12 a second later)', () => {
      const fills = [
        r(piece10),
        r(rollup11),
        r(piece11),
        r({ fillId: '12', fillPrice: 101, fillDate: '20261117', ssboe: at + 1 }),
      ]
      expect(tags(preferHistoryFills(fills))).toEqual([
        'replay:10x1@100.25',
        'replay:11x1@100',
        'replay:12x1@101',
      ])
      expect(bought(prepareRithmicProtocolFills(fills).fills)).toBe(3)
    })

    it('ignores unrelated orders on both sides of the run', () => {
      const fills = [
        r({ fillId: '8', fillPrice: 99, fillDate: '20261117', ssboe: at }),
        r(piece10),
        r(rollup11),
        r(piece11),
        r({ fillId: '12', fillPrice: 101, fillDate: '20261117', ssboe: at + 1 }),
      ]
      expect(bought(prepareRithmicProtocolFills(fills).fills)).toBe(4)
    })

    it('matches the basketed result for the same rows', () => {
      const fills = [
        r({ fillId: '8', fillPrice: 99, basketId: 'x', fillDate: '20261117', ssboe: at }),
        r({ ...piece10, basketId: 'a' }),
        r({ ...rollup11, basketId: 'a' }),
        r({ ...piece11, basketId: 'a' }),
      ]
      expect(tags(preferHistoryFills(fills))).toEqual([
        'replay:8x1@99',
        'replay:10x1@100.25',
        'replay:11x1@100',
      ])
    })

    it('does nothing without another row sharing the rollup fill id', () => {
      const fills = [r(piece10), r(rollup11)]
      expect(tags(preferHistoryFills(fills))).toEqual(['replay:10x1@100.25', 'replay:11x2@100'])
    })

    it('a non-numeric id is outside the run and does not block the collapse', () => {
      const fills = [
        r({ fillId: 'abc', fillPrice: 99, fillDate: '20261117', ssboe: at }),
        r(piece10),
        r(rollup11),
        r(piece11),
      ]
      expect(tags(preferHistoryFills(fills))).toEqual([
        'replay:abcx1@99',
        'replay:10x1@100.25',
        'replay:11x1@100',
      ])
    })
  })
})

describe('cmeTradeDateFromMs', () => {
  it('rolls at 17:00 Chicago and skips the weekend', () => {
    expect(cmeTradeDateFromMs(Date.parse('2026-11-17T21:59:00Z'))).toBe('20261117') // 15:59 CT
    expect(cmeTradeDateFromMs(Date.parse('2026-11-17T23:00:00Z'))).toBe('20261118') // 17:00 CT
    expect(cmeTradeDateFromMs(Date.parse('2026-11-22T23:30:00Z'))).toBe('20261123') // Sun 17:30 CT
    expect(cmeTradeDateFromMs(Date.parse('2026-11-20T23:30:00Z'))).toBe('20261123') // Fri 17:30 CT
  })
})
