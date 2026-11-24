import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  cmeTradeDateFromMs,
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

describe('cmeTradeDateFromMs', () => {
  it('rolls at 17:00 Chicago and skips the weekend', () => {
    expect(cmeTradeDateFromMs(Date.parse('2026-11-17T21:59:00Z'))).toBe('20261117') // 15:59 CT
    expect(cmeTradeDateFromMs(Date.parse('2026-11-17T23:00:00Z'))).toBe('20261118') // 17:00 CT
    expect(cmeTradeDateFromMs(Date.parse('2026-11-22T23:30:00Z'))).toBe('20261123') // Sun 17:30 CT
    expect(cmeTradeDateFromMs(Date.parse('2026-11-20T23:30:00Z'))).toBe('20261123') // Fri 17:30 CT
  })
})
