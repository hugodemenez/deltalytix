import { describe, expect, it } from 'vitest'
import {
  RITHMIC_PROTOCOL_SYNC_DEGRADED_CODE,
  rithmicProtocolCronOutcome,
  rithmicProtocolDashboardSyncDisposition,
  rithmicProtocolSyncDegradedDetails,
  rithmicProtocolSyncHttpSuccess,
} from './sync-outcome'

describe('rithmicProtocolSyncHttpSuccess', () => {
  it('does not report success on a degraded freeze', () => {
    expect(rithmicProtocolSyncHttpSuccess('degraded')).toBe(false)
  })

  it('reports success only for a completed ok sync', () => {
    expect(rithmicProtocolSyncHttpSuccess('ok')).toBe(true)
    expect(rithmicProtocolSyncHttpSuccess(undefined)).toBe(true)
  })

  it('is the same gate used by HTTP, cron, and v1 connection sync', () => {
    expect(rithmicProtocolSyncHttpSuccess('degraded')).toBe(false)
    expect(
      rithmicProtocolCronOutcome({ syncStatus: 'degraded' }).ok,
    ).toBe(false)
  })
})

describe('rithmicProtocolCronOutcome', () => {
  it('counts a degraded freeze as a failed attempt', () => {
    expect(
      rithmicProtocolCronOutcome({ syncStatus: 'degraded', error: undefined }),
    ).toEqual({ ok: false, reason: 'DEGRADED' })
  })

  it('treats duplicate trades as a healthy no-op', () => {
    expect(
      rithmicProtocolCronOutcome({
        syncStatus: 'ok',
        error: 'DUPLICATE_TRADES',
      }),
    ).toEqual({ ok: true })
  })

  it('propagates a hard sync error', () => {
    expect(
      rithmicProtocolCronOutcome({
        syncStatus: 'ok',
        error: 'SAVE_TRADES_FAILED',
      }),
    ).toEqual({ ok: false, reason: 'SAVE_TRADES_FAILED' })
  })
})

describe('rithmicProtocolDashboardSyncDisposition', () => {
  it('refreshes a degraded dashboard payload instead of treating it as SYNC_FAILED', () => {
    expect(
      rithmicProtocolDashboardSyncDisposition({
        success: false,
        message: RITHMIC_PROTOCOL_SYNC_DEGRADED_CODE,
        syncStatus: 'degraded',
      }),
    ).toBe('degraded')
    expect(
      rithmicProtocolDashboardSyncDisposition({
        success: false,
        message: 'SYNC_FAILED',
      }),
    ).toBe('failed')
  })
})

describe('rithmicProtocolSyncDegradedDetails', () => {
  it('keeps partial-import counts for the v1 409 body', () => {
    expect(
      rithmicProtocolSyncDegradedDetails({
        savedCount: 3,
        tradesCount: 8,
        syncStatus: 'degraded',
        syncStats: { fillsAfterDedup: 12, closedTrades: 8, openTradesSkipped: 1 },
      }),
    ).toEqual(
      expect.arrayContaining([
        { field: 'savedCount', message: '3' },
        { field: 'tradesCount', message: '8' },
        { field: 'fillsAfterDedup', message: '12' },
      ]),
    )
  })
})
