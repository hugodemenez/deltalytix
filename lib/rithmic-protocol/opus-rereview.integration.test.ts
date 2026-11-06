import { describe, expect, it } from 'vitest'
import en from '@/locales/en'
import fr from '@/locales/fr'
import { namespaceUserSuppliedEntryId } from '@/lib/opening-seed'
import { executeParsePlan, planFromHeaders } from '@/lib/import/parse-plan'
import { teamTraderPerformance } from '@/lib/teams/trader-stats'
import { sharedOgTradeStats } from '@/lib/og/shared-trade-stats'
import {
  RITHMIC_PROTOCOL_SYNC_DEGRADED_CODE,
  rithmicProtocolDashboardSyncDisposition,
  rithmicProtocolSyncDegradedDetails,
} from './sync-outcome'
import {
  fillHistoryWindowsComplete,
} from './history-fallback'
import {
  SNAPSHOT_CLOCK_MARGIN_MS,
  computeOpeningPositionChecks,
  decideOpeningSeeds,
  fifoEndPositionMatchesPEnd,
  indexFillsByCanonicalId,
  openingPositionKey,
  planOrdinarySyncTrades,
  reconcileBracketedSnapshots,
} from './opening-position'
import {
  buildTradesFromRithmicFills,
  fillTimestampMs,
  normalizeFillAccountId,
} from './fills-to-trades'
import { coveringAnnotatedTradeId } from './fill-ledger'
import { orderDueConnectionsForSync } from '@/lib/connection-sync-schedule'
import type { RithmicProtocolFill } from './types'

const ACCOUNT = 'LFE050-INT'
const at = (iso: string) => Date.parse(iso) / 1000
const WINDOW = Date.parse('2026-10-23T22:00:00.000Z')

function fill(
  overrides: Partial<RithmicProtocolFill> & { fillId: string; ssboe?: number },
): RithmicProtocolFill {
  return {
    accountId: ACCOUNT,
    symbol: 'MESZ6',
    transactionType: 'BUY',
    fillPrice: 7800,
    fillSize: 1,
    fillDate: '20261026',
    ...overrides,
  }
}

describe('Opus re-review integration: FIFO window + invariant (N1)', () => {
  it('seeds and FIFO-matches the same post-anchor stream, then checks P_end', () => {
    const leftover = fill({
      fillId: 'old',
      transactionType: 'SELL',
      fillSize: 2,
      ssboe: at('2026-09-01T14:00:00Z'),
    })
    const cover = fill({
      fillId: 'cover',
      transactionType: 'SELL',
      fillSize: 1,
      ssboe: at('2026-10-26T14:00:00Z'),
    })
    const fills = [leftover, cover]
    const positions = [{ accountId: ACCOUNT, symbol: 'MESZ6', netQuantity: 0 }]
    const checks = computeOpeningPositionChecks({
      fills,
      positions,
      sinceMs: WINDOW,
    })
    const decision = decideOpeningSeeds(checks, fills, WINDOW)
    expect(decision.seeds).toHaveLength(1)
    const { trades, openNets } = buildTradesFromRithmicFills(
      fills,
      'u1',
      new Map([['MES', { tickSize: 0.25, tickValue: 1.25 }]]),
      undefined,
      { openingSeeds: decision.seeds, sinceMs: WINDOW },
    )
    expect(trades).toHaveLength(1)
    expect(trades[0]?.closeId).toBe('cover')
    expect(
      fifoEndPositionMatchesPEnd({ openNets, positions }).ok,
    ).toBe(true)
    const leftoverFifo = buildTradesFromRithmicFills(
      fills,
      'u1',
      new Map([['MES', { tickSize: 0.25, tickValue: 1.25 }]]),
      undefined,
      { openingSeeds: decision.seeds },
    )
    expect(
      fifoEndPositionMatchesPEnd({
        openNets: leftoverFifo.openNets,
        positions,
      }).ok,
    ).toBe(false)
  })
})

describe('Opus re-review integration: completeness (H2, N3)', () => {
  it('requires fallback and replay success, and does not freeze on a covered throw', () => {
    expect(
      fillHistoryWindowsComplete({
        windowsPlanned: 2,
        windowsFetched: 1,
        windowThrew: true,
        fallbackRequired: true,
        fallbackSucceeded: true,
        replaySucceeded: true,
      }).complete,
    ).toBe(true)
    expect(
      fillHistoryWindowsComplete({
        windowsPlanned: 2,
        windowsFetched: 2,
        windowThrew: false,
        fallbackRequired: true,
        fallbackSucceeded: false,
        replaySucceeded: true,
      }).complete,
    ).toBe(false)
    expect(
      fillHistoryWindowsComplete({
        windowsPlanned: 2,
        windowsFetched: 2,
        windowThrew: false,
        replaySucceeded: false,
      }).complete,
    ).toBe(false)
  })
})

describe('Opus re-review integration: snapshot / no-data / degraded (M1, M2, M4)', () => {
  const capturedAtMs = Date.parse('2026-10-26T18:00:00.000Z')
  const flat = {
    positions: [] as { accountId: string; symbol: string; netQuantity: number }[],
    complete: true,
    capturedAtMs,
    capturedUntilMs: capturedAtMs + 400,
  }

  it('uses a clock margin and ledger fills for no-data, and degrades skipped symbols', () => {
    expect(
      reconcileBracketedSnapshots({
        before: flat,
        after: flat,
        fills: [
          fill({
            fillId: 'skew',
            ssboe: capturedAtMs / 1000 + 1,
          }),
        ],
      }).ok,
    ).toBe(true)
    expect(SNAPSHOT_CLOCK_MARGIN_MS).toBeGreaterThan(1000)
    expect(
      reconcileBracketedSnapshots({
        before: { ...flat, noDataAccountIds: [` ${ACCOUNT} `] },
        after: { ...flat, noDataAccountIds: [` ${ACCOUNT} `] },
        fills: [
          fill({
            fillId: 'ledger',
            ssboe: at('2026-10-26T14:00:00Z'),
          }),
        ],
      }).reason,
    ).toBe('pnl_no_data')
    const skipKey = openingPositionKey(ACCOUNT, 'MESZ6')
    const plan = planOrdinarySyncTrades({
      trades: [
        {
          accountNumber: ACCOUNT,
          entryId: 'x',
          closeId: 'y',
          closeDate: '2026-10-26T14:00:00.000Z',
        },
      ],
      fills: [fill({ fillId: 'x', ssboe: at('2026-10-26T13:00:00Z') })],
      snapshotOk: true,
      skippedSymbolKeys: new Set([skipKey]),
    })
    expect(plan.syncStatus).toBe('degraded')
    expect(plan.stampLastSyncedAt).toBe(false)
  })
})

describe('Opus re-review integration: dashboard, cron, v1, import (N2, M5, L5)', () => {
  it('classifies degraded dashboard sync and orders failed connections last', () => {
    expect(
      rithmicProtocolDashboardSyncDisposition({
        success: false,
        message: RITHMIC_PROTOCOL_SYNC_DEGRADED_CODE,
        syncStatus: 'degraded',
      }),
    ).toBe('degraded')
    expect(
      orderDueConnectionsForSync([
        {
          lastSyncedAt: new Date('2026-01-01T00:00:00Z'),
          lastSyncAttemptAt: new Date('2026-01-02T00:00:00Z'),
        },
        {
          lastSyncedAt: new Date('2026-01-02T00:00:00Z'),
          lastSyncAttemptAt: new Date('2026-01-02T00:00:00Z'),
        },
      ]).map((row) => row.lastSyncedAt.toISOString()),
    ).toEqual(['2026-01-02T00:00:00.000Z', '2026-01-01T00:00:00.000Z'])
    expect(
      rithmicProtocolSyncDegradedDetails({ savedCount: 2, tradesCount: 5 }).find(
        (row) => row.field === 'savedCount',
      )?.message,
    ).toBe('2')
    expect(namespaceUserSuppliedEntryId('opening-seed:acct:ES')).toBe(
      'user:opening-seed:acct:ES',
    )
    const plan = planFromHeaders([
      'Symbol',
      'Quantity',
      'Entry DT',
      'Entry Price',
      'Exit DT',
      'Exit Price',
      'ProfitLoss',
      'Entry ID',
    ])
    const parsed = executeParsePlan(
      [
        [
          'MNQ',
          '1',
          '2026-01-06 17:35:22',
          '25629.25',
          '2026-01-06 17:51:31',
          '25746.5',
          '469',
          'opening-seed:acct:MNQ',
        ],
      ],
      plan,
    )
    expect(parsed.trades[0]?.entryId).toBe('user:opening-seed:acct:MNQ')
    expect(en.rithmicProtocolSync.errors.SYNC_DEGRADED.length).toBeGreaterThan(20)
    expect(fr.rithmicProtocolSync.errors.SYNC_DEGRADED.length).toBeGreaterThan(20)
  })
})

describe('Opus re-review integration: fill-less expiry (M3)', () => {
  it('assigns fill_less_expiry and does not invert leftover history', () => {
    const leftover = fill({
      fillId: 'old-sell',
      transactionType: 'SELL',
      fillSize: 2,
      ssboe: at('2026-09-01T14:00:00Z'),
    })
    const checks = computeOpeningPositionChecks({
      fills: [leftover],
      positions: [{ accountId: ACCOUNT, symbol: 'MESZ6', netQuantity: 2 }],
      sinceMs: WINDOW,
    })
    expect(checks[0]).toMatchObject({ p0: 2, fillCount: 0, net: 0 })
    const decision = decideOpeningSeeds(checks, [leftover], WINDOW)
    expect(decision.seeds).toEqual([])
    expect(decision.skipped[0]?.reason).toBe('fill_less_expiry')
    const { trades, openNets } = buildTradesFromRithmicFills(
      [leftover],
      'u1',
      new Map([['MES', { tickSize: 0.25, tickValue: 1.25 }]]),
      undefined,
      { sinceMs: WINDOW },
    )
    expect(trades).toEqual([])
    expect(openNets).toEqual([])
  })
})

describe('Opus re-review integration: freeze index, timestamps, stats (L2, L4, M6)', () => {
  it('indexes absorbed ids, uses session open, and excludes seeds from counts', () => {
    const merged = fill({
      fillId: '1245663',
      ssboe: at('2026-10-26T14:00:00Z'),
      absorbedFillIds: ['1245660'],
    })
    expect(indexFillsByCanonicalId([merged]).get('1245660')).toBe(merged)
    expect(fillTimestampMs(fill({ fillId: 'no-clock' }))).not.toBe(
      Date.parse('2026-10-26T00:00:00.000Z'),
    )
    expect(normalizeFillAccountId(` ${ACCOUNT} `)).toBe(ACCOUNT)
    expect(
      coveringAnnotatedTradeId(
        {
          id: 'new',
          accountNumber: ACCOUNT,
          instrument: 'MES',
          entryDate: '2026-10-26T13:00:00.000Z',
          closeDate: '2026-10-26T14:00:00.000Z',
          entryId: 'a',
          closeId: 'b',
          side: 'Long',
          quantity: 1,
          entryPrice: '1',
          closePrice: '2',
        },
        [
          {
            id: 'annotated',
            accountNumber: ACCOUNT,
            instrument: 'MES',
            entryDate: '2026-10-26T13:00:00.000Z',
            closeDate: '2026-10-26T14:00:00.000Z',
            entryId: 'a',
            closeId: 'b',
            side: 'Long',
            quantity: 1,
            entryPrice: '1',
            closePrice: '2',
          },
        ],
      ),
    ).toBe('annotated')
    expect(
      teamTraderPerformance([
        { entryId: '1', pnl: 10, commission: 0, entryDate: '2026-01-01' },
        {
          entryId: 'opening-seed:x',
          pnl: 99,
          commission: 1,
          entryDate: '2026-01-01',
        },
      ]).statistics.totalTrades,
    ).toBe(1)
    expect(
      sharedOgTradeStats([
        { entryId: '1', pnl: 10, commission: 0 },
        { entryId: 'opening-seed:x', pnl: 99, commission: 1 },
      ]).totalTrades,
    ).toBe(1)
  })
})
