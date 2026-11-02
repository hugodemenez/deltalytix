import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  consolidateOrderFills,
  dedupeFills,
  markFillSource,
  preferHistoryFills,
} from './dedupe-fills'
import { buildTradesFromRithmicFills } from './fills-to-trades'
import type { RithmicProtocolFill } from './types'

const ACCOUNT = 'LFE050-***'
const tickBySymbol = new Map([
  ['MES', { tickSize: 0.25, tickValue: 1.25 }],
  ['ES', { tickSize: 0.25, tickValue: 12.5 }],
])

const fixture = JSON.parse(
  readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      'fixtures/lucid-atas-fills.json',
    ),
    'utf8',
  ),
) as {
  fills: RithmicProtocolFill[]
  journal: { tradeCount: number; grossPnl: number; overnightCount: number }
}

const at = (iso: string) => Date.parse(iso) / 1000

function pipeline(fills: RithmicProtocolFill[]) {
  const cleaned = consolidateOrderFills(dedupeFills(preferHistoryFills(fills)))
  return { cleaned, ...buildTradesFromRithmicFills(cleaned, 'u1', tickBySymbol) }
}

function fill(
  overrides: Partial<RithmicProtocolFill> & { fillId: string; fillDate: string; ssboe: number },
): RithmicProtocolFill {
  return {
    accountId: ACCOUNT,
    symbol: 'MESZ6',
    transactionType: 'SELL',
    fillPrice: 7800,
    fillSize: 2,
    ...overrides,
  }
}

function dayNet(fills: RithmicProtocolFill[]) {
  const byDay = new Map<string, number>()
  for (const row of fills) {
    const day = row.fillDate ?? ''
    const signed =
      row.transactionType === 'BUY' || row.transactionType === '1'
        ? row.fillSize
        : -row.fillSize
    byDay.set(day, (byDay.get(day) ?? 0) + signed)
  }
  return byDay
}

describe('Lucid trader ATAS executions (anonymized)', () => {
  const atasFills = markFillSource(fixture.fills, 'history')

  it('pairs the ATAS executions with a flat FIFO book', () => {
    const { trades, openSkipped } = buildTradesFromRithmicFills(
      atasFills,
      'u1',
      tickBySymbol,
    )
    const pnl = trades.reduce((sum, trade) => sum + trade.pnl, 0)
    const qty = trades.reduce((sum, trade) => sum + trade.quantity, 0)

    expect(openSkipped).toBe(0)
    expect(trades).toHaveLength(fixture.journal.tradeCount)
    expect(pnl).toBeCloseTo(fixture.journal.grossPnl, 10)
    expect(qty).toBe(358)
    expect(fixture.journal.overnightCount).toBe(0)
  })

  it('full history/replay pipeline stays flat', () => {
    const { trades, openSkipped } = pipeline(atasFills)
    const pnl = trades.reduce((sum, trade) => sum + trade.pnl, 0)
    const qty = trades.reduce((sum, trade) => sum + trade.quantity, 0)
    expect(openSkipped).toBe(0)
    expect(pnl).toBeCloseTo(fixture.journal.grossPnl, 10)
    expect(qty).toBe(358)
  })

  it('ends FIFO flat on every fillDate the ATAS file nets to zero', () => {
    const nets = dayNet(atasFills)
    for (const [day, net] of nets) {
      if (net !== 0) continue
      const dayFills = atasFills.filter((row) => row.fillDate === day)
      const { openSkipped } = buildTradesFromRithmicFills(
        dayFills,
        'u1',
        tickBySymbol,
      )
      expect({ day, openSkipped }).toEqual({ day, openSkipped: 0 })
    }
  })
})

describe('same-day holds still match', () => {
  it('pairs a 5-hour MES short on one fillDate', () => {
    const fills = markFillSource(
      [
        fill({
          fillId: 'in',
          fillDate: '20261009',
          fillSize: 1,
          ssboe: at('2026-10-09T13:00:00Z'),
        }),
        fill({
          fillId: 'out',
          fillDate: '20261009',
          fillSize: 1,
          transactionType: 'BUY',
          fillPrice: 7790,
          ssboe: at('2026-10-09T18:00:00Z'),
        }),
      ],
      'history',
    )
    const { trades, openSkipped } = pipeline(fills)
    expect(openSkipped).toBe(0)
    expect(trades).toHaveLength(1)
    expect(trades[0].side).toBe('Short')
    expect(trades[0].pnl).toBeCloseTo(50)
  })
})

describe('history-gap leftover shorts after delete+reimport', () => {
  it('still FIFO-pairs a real multi-day hold', () => {
    const fills = markFillSource(
      [
        fill({
          fillId: '9001',
          fillDate: '20261028',
          fillPrice: 7768.25,
          ssboe: at('2026-10-28T14:04:33Z'),
        }),
        fill({
          fillId: '9002',
          fillDate: '20261030',
          fillPrice: 7649.25,
          transactionType: 'BUY',
          ssboe: at('2026-10-30T14:11:36Z'),
        }),
      ],
      'history',
    )
    const { trades, openSkipped } = pipeline(fills)
    expect(openSkipped).toBe(0)
    expect(trades).toHaveLength(1)
    expect(trades[0]).toMatchObject({
      entryId: '9001',
      closeId: '9002',
      quantity: 2,
      side: 'Short',
    })
  })

  it('FIFO-pairs leftover size of a real multi-day hold after a same-day partial cover', () => {
    const fills = markFillSource(
      [
        fill({
          fillId: '9003',
          fillDate: '20261023',
          fillSize: 3,
          ssboe: at('2026-10-23T14:22:01Z'),
        }),
        fill({
          fillId: '9004',
          fillDate: '20261023',
          fillSize: 1,
          fillPrice: 7798,
          transactionType: 'BUY',
          ssboe: at('2026-10-23T14:25:00Z'),
        }),
        fill({
          fillId: '9005',
          fillDate: '20261026',
          fillSize: 1,
          fillPrice: 7904,
          transactionType: 'BUY',
          ssboe: at('2026-10-26T14:00:00Z'),
        }),
        fill({
          fillId: '9006',
          fillDate: '20261026',
          fillSize: 1,
          fillPrice: 7900.75,
          transactionType: 'BUY',
          ssboe: at('2026-10-26T14:01:00Z'),
        }),
      ],
      'history',
    )
    const { trades, openSkipped } = pipeline(fills)
    expect(openSkipped).toBe(0)
    expect(trades).toHaveLength(3)
    expect(trades[0]).toMatchObject({
      entryId: '9003',
      closeId: '9004',
      quantity: 1,
      side: 'Short',
    })
    expect(trades.some((trade) => trade.closeId === '9005')).toBe(true)
    expect(trades.some((trade) => trade.closeId === '9006')).toBe(true)
  })

  it('without uncovered-day fills, a leftover short FIFO-joins a later sitting (the bug)', () => {
    const history = markFillSource(
      [
        fill({
          fillId: '9001',
          fillDate: '20261009',
          ssboe: at('2026-10-09T14:00:00Z'),
        }),
      ],
      'history',
    )
    const laterSitting = markFillSource(
      [
        fill({
          fillId: '9003',
          fillDate: '20261020',
          fillSize: 5,
          fillPrice: 7810,
          ssboe: at('2026-10-20T14:00:00Z'),
        }),
        fill({
          fillId: '9004',
          fillDate: '20261020',
          fillSize: 5,
          fillPrice: 7800,
          transactionType: 'BUY',
          ssboe: at('2026-10-20T14:05:00Z'),
        }),
      ],
      'replay',
    )
    const { trades } = pipeline([...history, ...laterSitting])
    expect(
      trades.some(
        (trade) =>
          trade.entryId === '9001' && String(trade.closeDate).startsWith('2026-10-20'),
      ),
    ).toBe(true)
  })

  it('keeps uncovered-day order-history so the leftover closes on the gap, not the later sitting', () => {
    const history = markFillSource(
      [
        fill({
          fillId: '9001',
          fillDate: '20261009',
          ssboe: at('2026-10-09T14:00:00Z'),
        }),
      ],
      'history',
    )
    const gapAndLater = markFillSource(
      [
        fill({
          fillId: '9002',
          fillDate: '20261010',
          fillPrice: 7795,
          transactionType: 'BUY',
          ssboe: at('2026-10-10T14:00:00Z'),
        }),
        fill({
          fillId: '9003',
          fillDate: '20261020',
          fillSize: 5,
          fillPrice: 7810,
          ssboe: at('2026-10-20T14:00:00Z'),
        }),
        fill({
          fillId: '9004',
          fillDate: '20261020',
          fillSize: 5,
          fillPrice: 7800,
          transactionType: 'BUY',
          ssboe: at('2026-10-20T14:05:00Z'),
        }),
      ],
      'replay',
    )
    const kept = preferHistoryFills([...history, ...gapAndLater])
    expect(kept.map((row) => row.fillId)).toContain('9002')

    const { trades, openSkipped } = pipeline([...history, ...gapAndLater])
    expect(openSkipped).toBe(0)
    expect(trades.some((trade) => trade.entryId === '9001' && trade.closeId === '9002')).toBe(
      true,
    )
    expect(trades.some((trade) => trade.entryId === '9001' && trade.closeId === '9004')).toBe(
      false,
    )
    expect(
      trades.some(
        (trade) =>
          trade.entryId === '9003' && trade.closeId === '9004' && trade.quantity === 5,
      ),
    ).toBe(true)
  })

  it('keeps order-history replay on a gap day between two history windows', () => {
    const history = markFillSource(
      [
        fill({
          fillId: 'h1',
          fillDate: '20260922',
          fillSize: 1,
          fillPrice: 7834.5,
          transactionType: 'BUY',
          ssboe: at('2026-09-22T19:57:11Z'),
        }),
        fill({
          fillId: 'h2',
          fillDate: '20260922',
          fillSize: 1,
          fillPrice: 7834,
          ssboe: at('2026-09-22T19:58:07Z'),
        }),
        fill({
          fillId: 'h3',
          fillDate: '20261020',
          fillSize: 1,
          fillPrice: 7810,
          ssboe: at('2026-10-20T14:00:00Z'),
        }),
        fill({
          fillId: 'h4',
          fillDate: '20261020',
          fillSize: 1,
          fillPrice: 7800,
          transactionType: 'BUY',
          ssboe: at('2026-10-20T14:05:00Z'),
        }),
      ],
      'history',
    )
    const gap = markFillSource(
      [
        fill({
          fillId: 'g1',
          fillDate: '20261009',
          fillSize: 2,
          ssboe: at('2026-10-09T14:00:00Z'),
        }),
        fill({
          fillId: 'g2',
          fillDate: '20261009',
          fillSize: 2,
          fillPrice: 7790,
          transactionType: 'BUY',
          ssboe: at('2026-10-09T14:05:00Z'),
        }),
      ],
      'replay',
    )
    const kept = preferHistoryFills([...history, ...gap])
    expect(kept.map((row) => row.fillId)).toEqual(
      expect.arrayContaining(['h1', 'h2', 'h3', 'h4', 'g1', 'g2']),
    )
    const { trades, openSkipped } = pipeline([...history, ...gap])
    expect(openSkipped).toBe(0)
    expect(trades).toHaveLength(3)
    expect(trades.some((trade) => trade.entryId === 'g1' && trade.closeId === 'g2')).toBe(true)
  })
})
