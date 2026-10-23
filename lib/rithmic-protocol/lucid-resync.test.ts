import { describe, expect, it } from 'vitest'
import { buildTradesFromRithmicFills } from './fills-to-trades'
import {
  dedupeFills,
  isSameRithmicProtocolRoundTrip,
  markFillSource,
  preferHistoryFills,
  resolveRithmicProtocolPersistedId,
} from './dedupe-fills'
import type { RithmicProtocolFill } from './types'

const ACCOUNT = 'LFE050-TEST-LUCID'
const tickBySymbol = new Map([['MES', { tickSize: 0.25, tickValue: 1.25 }]])

const at = (iso: string) => Date.parse(iso) / 1000

function fill(
  overrides: Partial<RithmicProtocolFill> & { ssboe: number },
): RithmicProtocolFill {
  return {
    accountId: ACCOUNT,
    symbol: 'MESZ6',
    transactionType: 'BUY',
    fillPrice: 7834.5,
    fillSize: 5,
    ...overrides,
  }
}

/** Lucid Sep 22: one long in, one 5-lot out. History settles the exit as one fill. */
const history = markFillSource(
  [
    fill({ fillId: '1162596', fillDate: '20260922', ssboe: at('2026-09-22T19:57:11Z') }),
    fill({
      fillId: '1163441',
      fillDate: '20260922',
      transactionType: 'SELL',
      fillPrice: 7834,
      ssboe: at('2026-09-22T19:58:07Z'),
    }),
  ],
  'history',
)

/** Replay: no fill_date, exit split into partials under two ids, clock jitter. */
const replay = markFillSource(
  [
    fill({ fillId: '239200544_1162596', ssboe: at('2026-09-22T19:57:14Z') }),
    fill({
      fillId: '1163440',
      transactionType: '2',
      fillPrice: 7834.25,
      fillSize: 2,
      ssboe: at('2026-09-22T19:58:09Z'),
    }),
    fill({
      fillId: '1163441',
      transactionType: '2',
      fillPrice: 7834,
      fillSize: 3,
      ssboe: at('2026-09-22T19:58:17Z'),
    }),
  ],
  'replay',
)

describe('Lucid history vs replay', () => {
  it('drops replay twins and partial splits when history covers the period', () => {
    const fills = dedupeFills(preferHistoryFills([...history, ...replay]))
    expect(fills).toHaveLength(2)
    expect(fills.every((f) => f.source === 'history')).toBe(true)
  })

  it('keeps FIFO flat: no open lot left to carry into the next session', () => {
    const fills = dedupeFills(preferHistoryFills([...history, ...replay]))
    const { trades, openSkipped } = buildTradesFromRithmicFills(fills, 'u1', tickBySymbol)
    expect(openSkipped).toBe(0)
    expect(trades).toHaveLength(1)
    expect(trades[0].quantity).toBe(5)
    expect(trades[0].side).toBe('Long')
  })

  it('without preferring history the extra partials leave an open lot (the bug)', () => {
    const { openSkipped } = buildTradesFromRithmicFills(
      dedupeFills([...history, ...replay]),
      'u1',
      tickBySymbol,
    )
    expect(openSkipped).toBeGreaterThan(0)
  })

  it('keeps replay fills newer than the last history fill', () => {
    const late = markFillSource(
      [fill({ fillId: '1170000', ssboe: at('2026-09-22T20:30:00Z') })],
      'replay',
    )
    const fills = preferHistoryFills([...history, ...late])
    expect(fills.map((f) => f.fillId)).toContain('1170000')
  })

  it('does not drop a replay fill that reuses an old session fill id', () => {
    const nextWeek = markFillSource(
      [fill({ fillId: '1162596', ssboe: at('2026-09-30T14:00:00Z') })],
      'replay',
    )
    expect(preferHistoryFills([...history, ...nextWeek])).toHaveLength(3)
  })

  it('keeps every replay fill on accounts with no history', () => {
    expect(preferHistoryFills(replay)).toHaveLength(3)
  })
})

describe('persisted identity ignores close-time jitter', () => {
  const stored = {
    id: 'stored-row',
    accountNumber: ACCOUNT,
    instrument: 'MES',
    entryId: '1163473',
    closeId: '1163832',
    entryDate: '2026-09-22T19:45:08.026Z',
    closeDate: '2026-09-22T19:47:51.163Z',
  }

  it('rematches the same fill pair when close time moved ~10s', () => {
    const resync = { ...stored, closeDate: '2026-09-22T19:48:01.219Z' }
    expect(resolveRithmicProtocolPersistedId(resync, [stored])).toBe('stored-row')
  })

  it('rematches a Replay-prefixed id with jittered times', () => {
    const resync = {
      ...stored,
      entryId: '239200544_1163473',
      entryDate: '2026-09-22T19:45:10.000Z',
      closeDate: '2026-09-22T19:48:01.219Z',
    }
    expect(resolveRithmicProtocolPersistedId(resync, [stored])).toBe('stored-row')
  })

  it('does not match a recycled fill pair from a later session', () => {
    const later = {
      ...stored,
      entryDate: '2026-10-07T19:45:08.026Z',
      closeDate: '2026-10-07T19:47:51.163Z',
    }
    expect(isSameRithmicProtocolRoundTrip(later, stored)).toBe(false)
    expect(resolveRithmicProtocolPersistedId(later, [stored])).toBeUndefined()
  })
})
