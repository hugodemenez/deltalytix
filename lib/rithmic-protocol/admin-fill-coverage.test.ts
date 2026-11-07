import { describe, expect, it } from 'vitest'
import {
  inWindowDerivedTrades,
  ordinarySyncTradesMatchRebuild,
  observeMappedFillRow,
  protocolTradeCoveredByRawFills,
  storedFillsMissingUpstream,
  uncoveredTradesByFillIdentity,
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
    ).toEqual({ resolved: true, source: 'history' })
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
