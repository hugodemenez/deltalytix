import { describe, expect, it } from 'vitest'
import { buildTradesFromRithmicFills } from './fills-to-trades'
import {
  canonicalRithmicFillId,
  dedupeFills,
  shouldReplayRecentExecutions,
} from './dedupe-fills'
import type { RithmicProtocolFill } from './types'

const tickBySymbol = new Map([['ES', { tickSize: 0.25, tickValue: 12.5 }]])

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
    ssboe: 1_725_289_800,
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
    fillDate: undefined,
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

describe('dedupeFills', () => {
  it('keeps one row when the same fill_id arrives from history and replay', () => {
    const history = historyFill({ transactionType: 'BUY' })
    const replay = replayTwin(history, '1')
    const out = dedupeFills([history, replay])
    expect(out).toHaveLength(1)
    expect(out[0].fillId).toBe('1452840')
    expect(out[0].transactionType).toBe('BUY')
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

  it('keeps distinct fill ids', () => {
    const out = dedupeFills([
      historyFill({ fillId: '1452840', transactionType: 'BUY' }),
      historyFill({ fillId: '1452841', transactionType: 'SELL', fillSize: 1 }),
    ])
    expect(out.map((fill) => fill.fillId)).toEqual(['1452840', '1452841'])
  })

  it('still dedupes exact copies when fill_id is missing', () => {
    const a = historyFill({ fillId: undefined })
    const b = { ...a }
    expect(dedupeFills([a, b])).toHaveLength(1)
  })
})

describe('shouldReplayRecentExecutions', () => {
  it('skips replay when ShowFillHistory already has UTC today', () => {
    expect(
      shouldReplayRecentExecutions(
        [historyFill({ fillDate: '20260904' })],
        '20260904',
      ),
    ).toBe(false)
  })

  it('replays when history has older days only (Test same-day lag)', () => {
    expect(
      shouldReplayRecentExecutions(
        [historyFill({ fillDate: '20260902', ssboe: undefined })],
        '20260904',
      ),
    ).toBe(true)
  })
})

describe('duplicate fills do not inflate FIFO trades', () => {
  const entry = historyFill({
    fillId: '1452840',
    transactionType: 'BUY',
    fillPrice: 5000,
    ssboe: 1_725_289_800,
  })
  const exit = historyFill({
    fillId: '1452900',
    transactionType: 'SELL',
    fillPrice: 5010,
    ssboe: 1_725_290_400,
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
})
