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
import {
  buildTradesFromRithmicFills,
  cmeSessionDayKey,
  isSameCmeSession,
} from './fills-to-trades'
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

function overnightTrades(
  trades: Array<{ entryDate: string | Date | null; closeDate: string | Date | null }>,
) {
  return trades.filter((trade) => {
    const entry = Date.parse(String(trade.entryDate ?? ''))
    const close = Date.parse(String(trade.closeDate ?? ''))
    if (!Number.isFinite(entry) || !Number.isFinite(close)) return false
    return !isSameCmeSession(entry, close)
  })
}

function sessionNet(fills: RithmicProtocolFill[]) {
  const bySession = new Map<string, number>()
  for (const fill of fills) {
    const ts =
      typeof fill.ssboe === 'number' && fill.ssboe > 0
        ? fill.ssboe * 1000
        : Date.parse(`${fill.fillDate}T00:00:00Z`)
    const session = cmeSessionDayKey(ts)
    const signed =
      fill.transactionType === 'BUY' || fill.transactionType === '1'
        ? fill.fillSize
        : -fill.fillSize
    bySession.set(session, (bySession.get(session) ?? 0) + signed)
  }
  return bySession
}

describe('CME session key', () => {
  it('rolls at 17:00 America/Chicago', () => {
    // 2026-09-22 is CDT (UTC-5): 16:59 CT = 21:59 UTC, 17:00 CT = 22:00 UTC.
    expect(cmeSessionDayKey(Date.parse('2026-09-22T21:59:09Z'))).toBe('20260922')
    expect(cmeSessionDayKey(Date.parse('2026-09-22T22:00:04Z'))).toBe('20260923')
    expect(
      isSameCmeSession(
        Date.parse('2026-09-22T21:59:09Z'),
        Date.parse('2026-09-22T22:00:04Z'),
      ),
    ).toBe(true)
    expect(
      isSameCmeSession(
        Date.parse('2026-10-09T16:27:58Z'),
        Date.parse('2026-10-20T17:55:12Z'),
      ),
    ).toBe(false)
  })
})

describe('Lucid trader ATAS executions (anonymized)', () => {
  const atasFills = markFillSource(fixture.fills, 'history')

  it('pairs the ATAS executions with no multi-day overnight shorts', () => {
    const { trades, openSkipped } = buildTradesFromRithmicFills(
      atasFills,
      'u1',
      tickBySymbol,
    )
    const pnl = trades.reduce((sum, trade) => sum + trade.pnl, 0)
    const qty = trades.reduce((sum, trade) => sum + trade.quantity, 0)

    expect(openSkipped).toBe(0)
    expect(overnightTrades(trades)).toHaveLength(0)
    expect(trades).toHaveLength(fixture.journal.tradeCount)
    expect(pnl).toBeCloseTo(fixture.journal.grossPnl, 10)
    expect(qty).toBe(358)
    expect(fixture.journal.overnightCount).toBe(0)
  })

  it('full history/replay pipeline stays flat and invents no overnight shorts', () => {
    const { trades, openSkipped } = pipeline(atasFills)
    const pnl = trades.reduce((sum, trade) => sum + trade.pnl, 0)
    expect(openSkipped).toBe(0)
    expect(overnightTrades(trades)).toHaveLength(0)
    expect(pnl).toBeCloseTo(fixture.journal.grossPnl, 10)
  })

  it('ends FIFO flat in every CME session the ATAS file is flat', () => {
    const nets = sessionNet(atasFills)
    for (const [session, net] of nets) {
      if (net !== 0) continue
      const sessionFills = atasFills.filter((fill) => {
        const ts = (fill.ssboe ?? 0) * 1000
        return cmeSessionDayKey(ts) === session
      })
      const { openSkipped } = buildTradesFromRithmicFills(
        sessionFills,
        'u1',
        tickBySymbol,
      )
      expect({ session, openSkipped }).toEqual({ session, openSkipped: 0 })
    }
  })

  it('does not let an unmatched Oct 9 short close on Oct 20', () => {
    const leftover: RithmicProtocolFill = {
      accountId: ACCOUNT,
      symbol: 'MESZ6',
      transactionType: 'SELL',
      fillPrice: 7838,
      fillSize: 2,
      fillId: '1400000-leftover',
      fillDate: '20261009',
      ssboe: at('2026-10-09T16:30:00Z'),
      source: 'replay',
    }
    const oct9 = atasFills.filter((fill) => fill.fillDate === '20261009')
    const oct20 = atasFills.filter((fill) => fill.fillDate === '20261020')
    const { trades, openSkipped } = pipeline([...oct9, leftover, ...oct20])

    expect(overnightTrades(trades)).toHaveLength(0)
    expect(
      trades.some(
        (trade) =>
          String(trade.entryDate).startsWith('2026-10-09') &&
          String(trade.closeDate).startsWith('2026-10-20'),
      ),
    ).toBe(false)
    // Oct 20 ATAS is a 5-lot short that buys back immediately; leftover
    // expires at the session cut instead of stealing those covers.
    expect(openSkipped).toBeGreaterThan(0)
    expect(
      trades.some(
        (trade) =>
          trade.side === 'Short' && String(trade.closeDate).startsWith('2026-10-20'),
      ),
    ).toBe(true)
  })
})

describe('same-session holds still match', () => {
  it('pairs a 5-hour MES short that stays inside one Globex session', () => {
    const fills = markFillSource(
      [
        {
          accountId: ACCOUNT,
          symbol: 'MESZ6',
          transactionType: 'SELL',
          fillPrice: 7800,
          fillSize: 1,
          fillId: 'in',
          fillDate: '20261009',
          ssboe: at('2026-10-09T13:00:00Z'),
        },
        {
          accountId: ACCOUNT,
          symbol: 'MESZ6',
          transactionType: 'BUY',
          fillPrice: 7790,
          fillSize: 1,
          fillId: 'out',
          fillDate: '20261009',
          ssboe: at('2026-10-09T18:00:00Z'),
        },
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

describe('reported Lucid overnight shorts after delete+reimport', () => {
  it('does not invent a 2-lot MES short across later calendar sessions', () => {
    const fills = markFillSource(
      [
        {
          accountId: ACCOUNT,
          symbol: 'MESZ6',
          transactionType: 'SELL',
          fillPrice: 7768.25,
          fillSize: 2,
          fillId: '9001',
          fillDate: '20261028',
          ssboe: at('2026-10-28T14:04:33Z'),
        },
        {
          accountId: ACCOUNT,
          symbol: 'MESZ6',
          transactionType: 'BUY',
          fillPrice: 7649.25,
          fillSize: 2,
          fillId: '9002',
          fillDate: '20261030',
          ssboe: at('2026-10-30T14:11:36Z'),
        },
      ],
      'history',
    )
    const { trades, openSkipped } = pipeline(fills)
    expect(trades).toHaveLength(0)
    expect(overnightTrades(trades)).toHaveLength(0)
    expect(openSkipped).toBe(4)
    expect(
      trades.some(
        (trade) =>
          trade.entryId === '9001' &&
          trade.closeId === '9002' &&
          trade.pnl === 1190,
      ),
    ).toBe(false)
  })

  it('does not close leftover lots from a same-session entry on later-session fills', () => {
    const fills = markFillSource(
      [
        {
          accountId: ACCOUNT,
          symbol: 'MESZ6',
          transactionType: 'SELL',
          fillPrice: 7800,
          fillSize: 3,
          fillId: '9003',
          fillDate: '20261023',
          ssboe: at('2026-10-23T14:22:01Z'),
        },
        {
          accountId: ACCOUNT,
          symbol: 'MESZ6',
          transactionType: 'BUY',
          fillPrice: 7798,
          fillSize: 1,
          fillId: '9004',
          fillDate: '20261023',
          ssboe: at('2026-10-23T14:25:00Z'),
        },
        {
          accountId: ACCOUNT,
          symbol: 'MESZ6',
          transactionType: 'BUY',
          fillPrice: 7904,
          fillSize: 1,
          fillId: '9005',
          fillDate: '20261026',
          ssboe: at('2026-10-26T14:00:00Z'),
        },
        {
          accountId: ACCOUNT,
          symbol: 'MESZ6',
          transactionType: 'BUY',
          fillPrice: 7900.75,
          fillSize: 1,
          fillId: '9006',
          fillDate: '20261026',
          ssboe: at('2026-10-26T14:01:00Z'),
        },
      ],
      'history',
    )
    const { trades, openSkipped } = pipeline(fills)
    expect(overnightTrades(trades)).toHaveLength(0)
    expect(trades).toHaveLength(1)
    expect(trades[0]).toMatchObject({
      entryId: '9003',
      closeId: '9004',
      quantity: 1,
      side: 'Short',
    })
    expect(trades.some((trade) => trade.closeId === '9005')).toBe(false)
    expect(trades.some((trade) => trade.closeId === '9006')).toBe(false)
    expect(openSkipped).toBeGreaterThan(0)
  })
})
