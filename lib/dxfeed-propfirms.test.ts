import { describe, expect, it } from 'vitest'
import { getDxFeedPropFirmByHost } from './dxfeed-propfirms'

describe('dxfeed-propfirms', () => {
  it('resolves a firm from historical and trading hosts', () => {
    expect(getDxFeedPropFirmByHost('https://volumetrica.miltraders.com')?.id).toBe(
      'miltraders',
    )
    expect(getDxFeedPropFirmByHost('trading-volumetrica.phoenixtraderfunding.com')?.id).toBe(
      'phoenixtraderfunding',
    )
  })

  it('does not resolve unrelated hosts', () => {
    expect(getDxFeedPropFirmByHost('https://example.com')).toBeUndefined()
  })
})
