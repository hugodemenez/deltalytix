import { describe, expect, it } from 'vitest'
import { detectDxFeedPropFirmFromHost } from './dxfeed-propfirms'

describe('detectDxFeedPropFirmFromHost', () => {
  it('reads the firm from a public dxFeed subdomain', () => {
    expect(detectDxFeedPropFirmFromHost('https://dxfeed.hyperticks.com')).toEqual({
      id: 'hyperticks',
      name: 'Hyperticks',
    })
    expect(
      detectDxFeedPropFirmFromHost('https://volumetrica.miltraders.com'),
    ).toEqual({
      id: 'miltraders',
      name: 'Miltraders',
    })
    expect(
      detectDxFeedPropFirmFromHost('https://dxfeed.myfundedfutures.com'),
    ).toEqual({
      id: 'myfundedfutures',
      name: 'Myfundedfutures',
    })
  })

  it('reads the firm from Volumetrica infrastructure hosts', () => {
    expect(
      detectDxFeedPropFirmFromHost('https://hyperticks.volumetricaprop.com'),
    ).toEqual({
      id: 'hyperticks',
      name: 'Hyperticks',
    })
    expect(
      detectDxFeedPropFirmFromHost(
        'https://hyperticks.trading.volumetricaprop.com',
      ),
    ).toEqual({
      id: 'hyperticks',
      name: 'Hyperticks',
    })
  })

  it('returns null when the host is missing or not a firm site', () => {
    expect(detectDxFeedPropFirmFromHost(null)).toBeNull()
    expect(detectDxFeedPropFirmFromHost('https://volumetricaprop.com')).toBeNull()
  })
})
