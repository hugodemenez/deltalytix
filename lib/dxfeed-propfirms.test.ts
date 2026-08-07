import { describe, expect, it } from 'vitest'
import {
  authPropfirmMatchesSelection,
  buildHistoricalHostForPropFirm,
  buildTradingHostForPropFirm,
  getDxFeedPropFirm,
  getDxFeedPropFirmByAuthName,
  getEnabledDxFeedPropFirms,
} from './dxfeed-propfirms'

describe('dxfeed prop firms', () => {
  it('enables My Funded Futures with its dxFeed endpoints', () => {
    const firm = getDxFeedPropFirm('myfundedfutures')

    expect(firm).toMatchObject({
      name: 'My Funded Futures',
      website: 'https://dxfeed.myfundedfutures.com',
      enabled: true,
    })
    expect(buildHistoricalHostForPropFirm(firm!)).toBe(
      'https://dxfeed.myfundedfutures.com',
    )
    expect(buildTradingHostForPropFirm(firm!)).toBe(
      'https://dxfeed.myfundedfutures.com',
    )
  })

  it('resolves My Funded Futures from normalized ids and auth names', () => {
    expect(getDxFeedPropFirm('My Funded Futures')?.id).toBe('myfundedfutures')
    expect(getDxFeedPropFirmByAuthName('MyFundedFutures')?.id).toBe(
      'myfundedfutures',
    )
    expect(getDxFeedPropFirmByAuthName('MFFU')?.id).toBe('myfundedfutures')
    expect(
      authPropfirmMatchesSelection('MFFU', getDxFeedPropFirm('myfundedfutures')!),
    ).toBe(true)
    expect(getEnabledDxFeedPropFirms()).toContainEqual(
      expect.objectContaining({ id: 'myfundedfutures' }),
    )
  })
})
