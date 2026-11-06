import { describe, expect, it } from 'vitest'
import {
  rithmicProtocolCronOutcome,
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
