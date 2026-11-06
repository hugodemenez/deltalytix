import { describe, expect, it } from 'vitest'
import { rithmicProtocolSyncHttpSuccess } from '@/lib/rithmic-protocol/sync-outcome'

describe('ordinary sync HTTP success flag', () => {
  it('must not report success on a degraded freeze', () => {
    expect(rithmicProtocolSyncHttpSuccess('degraded')).toBe(false)
  })

  it('reports success only for a completed ok sync', () => {
    expect(rithmicProtocolSyncHttpSuccess('ok')).toBe(true)
  })
})
