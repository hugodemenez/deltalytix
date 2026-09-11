import { describe, expect, it } from 'vitest'
import { buildTradesFromRithmicFills } from './fills-to-trades'
import {
  canonicalRithmicFillId,
  dedupeFills,
  fillDayKey,
  fillIdentityKey,
} from './dedupe-fills'
import type { RithmicProtocolFill } from './types'

const tickBySymbol = new Map([['ES', { tickSize: 0.25, tickValue: 12.5 }]])

/** 2026-09-02 19:30 UTC — still 14:30 CT, same CME session as fillDate. */
const SEP2_SSBOE = Date.UTC(2026, 8, 2, 19, 30, 0) / 1000
const SEP2_EXIT_SSBOE = Date.UTC(2026, 8, 2, 19, 40, 0) / 1000

function historyFill(
  overrides: Partial<RithmicProtocolFill> = {},
): RithmicProtocolFill {
  return {
    accountId: 'PA-APEX-39878-10',
    symbol: 'ESH5',
    transactionType: 'BUY',
    fillPrice: 5000,
    fillSize: 1,
    fillId: '1452840',
    fillDate: '20260902',
    fillTime: '14:30:00',
    ssboe: SEP2_SSBOE,
    ...overrides,
  }
}

/** Replay / exchange notification: same fill, enum side, different clock fields. */
function replayTwin(
  fill: RithmicProtocolFill,
  transactionType: string,
): RithmicProtocolFill {
  return {
    ...fill,
    transactionType,
    basketId: fill.basketId ?? 'basket-1',
    fillTime: undefined,
    ssboe: (fill.ssboe ?? 0) + 1,
  }
}

describe('canonicalRithmicFillId', () => {
  it('keeps a plain fill id', () => {
    expect(canonicalRithmicFillId('1452840')).toBe('1452840')
  })

  it('collapses a repeated id-id leftover to the single fill id', () => {
    expect(canonicalRithmicFillId('1452840-1452840')).toBe('1452840')
  })

  it('does not collapse two distinct hyphenated ids', () => {
    expect(canonicalRithmicFillId('1452840-1452841')).toBe('1452840-1452841')
  })
})

describe('fillDayKey', () => {
  it('prefers fill_date (exchange trade date) over ssboe UTC day', () => {
    // After ~17:00 CT the session date is already the next day; ssboe can
    // still be the previous UTC calendar day. Identity must follow fill_date.
    const evening = historyFill({
      fillDate: '20260903',
      ssboe: Date.UTC(2026, 8, 2, 23, 30, 0) / 1000,
    })
    expect(fillDayKey(evening)).toBe('20260903')
    expect(fillIdentityKey(evening)).toBe(
      'id|PA-APEX-39878-10|20260903|1452840',
    )
  })

  it('falls back to ssboe truncated to a UTC day when fill_date is absent', () => {
    expect(
      fillDayKey(historyFill({ fillDate: undefined, ssboe: SEP2_SSBOE })),
    ).toBe('20260902')
  })
})

describe('dedupeFills', () => {
  it('keeps one row when the same fill_id arrives from history and replay', () => {
    const history = historyFill({ transactionType: 'BUY' })
    const replay = replayTwin(history, '1')
    const out = dedupeFills([history, replay])
    expect(out).toHaveLength(1)
    expect(out[0].fillId).toBe('1452840')
    expect(out[0].transactionType).toBe('BUY')
  })

  it('collapses a replay twin that only has ssboe on the same trade day', () => {
    const history = historyFill({ fillDate: '20260902', ssboe: SEP2_SSBOE })
    const replay = {
      ...history,
      transactionType: '1',
      fillDate: undefined,
      fillTime: undefined,
      ssboe: SEP2_SSBOE + 1,
    }
    expect(dedupeFills([history, replay])).toHaveLength(1)
  })

  it('treats id and id-id as the same fill', () => {
    const clean = historyFill({ fillId: '1452840' })
    const doubled = historyFill({
      fillId: '1452840-1452840',
      transactionType: '1',
    })
    const out = dedupeFills([clean, doubled])
    expect(out).toHaveLength(1)
    expect(out[0].fillId).toBe('1452840')
  })

  it('keeps distinct fill ids on the same day', () => {
    const out = dedupeFills([
      historyFill({ fillId: '1452840', transactionType: 'BUY' }),
      historyFill({ fillId: '1452841', transactionType: 'SELL', fillSize: 1 }),
    ])
    expect(out.map((fill) => fill.fillId)).toEqual(['1452840', '1452841'])
  })

  it('does not collapse the same fill_id on different trade dates', () => {
    const day1 = historyFill({ fillId: '1452840', fillDate: '20260902' })
    const day2 = historyFill({
      fillId: '1452840',
      fillDate: '20260903',
      ssboe: Date.UTC(2026, 8, 3, 19, 30, 0) / 1000,
    })
    const out = dedupeFills([day1, day2])
    expect(out).toHaveLength(2)
    expect(out.map((fill) => fillDayKey(fill))).toEqual(['20260902', '20260903'])
  })

  it('still dedupes exact copies when fill_id is missing', () => {
    const a = historyFill({ fillId: undefined })
    const b = { ...a }
    expect(dedupeFills([a, b])).toHaveLength(1)
  })
})

describe('duplicate fills do not inflate FIFO trades', () => {
  const entry = historyFill({
    fillId: '1452840',
    transactionType: 'BUY',
    fillPrice: 5000,
    ssboe: SEP2_SSBOE,
  })
  const exit = historyFill({
    fillId: '1452900',
    transactionType: 'SELL',
    fillPrice: 5010,
    ssboe: SEP2_EXIT_SSBOE,
  })

  function pnlOf(fills: RithmicProtocolFill[]) {
    return buildTradesFromRithmicFills(fills, 'user-1', tickBySymbol)
  }

  it('matches single-source qty and PnL when the same ids arrive twice', () => {
    const single = pnlOf([entry, exit])
    const doubled = pnlOf(
      dedupeFills([
        entry,
        exit,
        replayTwin(entry, '1'),
        replayTwin(exit, '2'),
        { ...entry, fillId: '1452840-1452840', transactionType: '1' },
        { ...exit, fillId: '1452900-1452900', transactionType: '2' },
      ]),
    )

    expect(single.trades).toHaveLength(1)
    expect(doubled.trades).toHaveLength(1)
    expect(doubled.trades[0].quantity).toBe(single.trades[0].quantity)
    expect(doubled.trades[0].pnl).toBe(single.trades[0].pnl)
    expect(doubled.trades[0].quantity).toBe(1)
    expect(doubled.trades[0].pnl).toBe(500)
    expect(doubled.trades[0].entryId).toBe('1452840')
    expect(doubled.trades[0].closeId).toBe('1452900')
    expect(single.trades[0].id).toBe(doubled.trades[0].id)
  })

  it('buildTradesFromRithmicFills itself ignores a second copy of the same fill_id', () => {
    const { trades } = buildTradesFromRithmicFills(
      [entry, replayTwin(entry, '1'), exit, replayTwin(exit, '2')],
      'user-1',
      tickBySymbol,
    )
    expect(trades).toHaveLength(1)
    expect(trades[0].entryId).toBe('1452840')
    expect(trades[0].closeId).toBe('1452900')
    expect(trades[0].quantity).toBe(1)
    expect(trades[0].pnl).toBe(500)
  })

  it('FIFO still matches two same-id fills that fall on different trade dates', () => {
    const day1Entry = historyFill({
      fillId: '1452840',
      fillDate: '20260902',
      transactionType: 'BUY',
      fillPrice: 5000,
      ssboe: SEP2_SSBOE,
    })
    const day1Exit = historyFill({
      fillId: '1452900',
      fillDate: '20260902',
      transactionType: 'SELL',
      fillPrice: 5010,
      ssboe: SEP2_EXIT_SSBOE,
    })
    const day2Entry = historyFill({
      fillId: '1452840',
      fillDate: '20260903',
      transactionType: 'BUY',
      fillPrice: 5000,
      ssboe: Date.UTC(2026, 8, 3, 19, 30, 0) / 1000,
    })
    const day2Exit = historyFill({
      fillId: '1452900',
      fillDate: '20260903',
      transactionType: 'SELL',
      fillPrice: 5010,
      ssboe: Date.UTC(2026, 8, 3, 19, 40, 0) / 1000,
    })

    const { trades } = buildTradesFromRithmicFills(
      [day1Entry, day1Exit, day2Entry, day2Exit],
      'user-1',
      tickBySymbol,
    )
    expect(trades).toHaveLength(2)
    expect(trades.every((trade) => trade.quantity === 1)).toBe(true)
    expect(trades.every((trade) => trade.pnl === 500)).toBe(true)
  })
})
