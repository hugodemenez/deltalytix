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

  it('enables HyperTicks with Taurus-style dxFeed endpoints', () => {
    const firm = getDxFeedPropFirm('hyperticks')

    expect(firm).toMatchObject({
      name: 'HyperTicks',
      website: 'https://dxfeed.hyperticks.com',
      enabled: true,
    })
    expect(buildHistoricalHostForPropFirm(firm!)).toBe(
      'https://dxfeed.hyperticks.com',
    )
    expect(buildTradingHostForPropFirm(firm!)).toBe(
      'https://trading-dxfeed.hyperticks.com',
    )
  })

  it('resolves HyperTicks from ids, branding, and the ATAS misspelling', () => {
    expect(getDxFeedPropFirm('HyperTicks')?.id).toBe('hyperticks')
    expect(getDxFeedPropFirmByAuthName('Hyperticks')?.id).toBe('hyperticks')
    expect(getDxFeedPropFirmByAuthName('Hypertricks')?.id).toBe('hyperticks')
    expect(
      authPropfirmMatchesSelection(
        'Hypertricks',
        getDxFeedPropFirm('hyperticks')!,
      ),
    ).toBe(true)
    expect(getEnabledDxFeedPropFirms()).toContainEqual(
      expect.objectContaining({ id: 'hyperticks' }),
    )
  })
})
