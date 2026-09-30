import { describe, expect, it } from 'vitest'
import {
  getMatchingAccountSizes,
  propFirmMatchesSearch,
  propFirms,
} from './config'

describe('Funded Futures Family prop firm preset', () => {
  const firm = propFirms.fundedFuturesFamily

  it('is listed separately from My Funded Futures', () => {
    expect(firm).toBeDefined()
    expect(firm.name).toBe('Funded Futures Family')
    expect(firm.aliases).toEqual(['FFF', 'FFFamily'])
    expect(propFirms.myFundedFutures.name).toBe('My Funded Futures')
    expect(propFirms.myFundedFutures.name).not.toBe(firm.name)
    expect(Object.hasOwn(propFirms, 'fundedFuturesNetwork')).toBe(false)
  })

  it('uses verified Prime evaluation numbers from the official plan page', () => {
    expect(firm.accountSizes.PRIME_50K).toMatchObject({
      name: 'Prime 50K',
      balance: 50000,
      price: 179,
      priceWithPromo: 179,
      target: 3000,
      drawdown: 2000,
      dailyLoss: null,
      rulesDailyLoss: 'No',
      trailing: 'EOD',
      consistency: 40,
      activationFees: 0,
      profitSharing: 90,
      tradingNewsAllowed: true,
      balanceRequired: 52100,
      minTradingDaysForPayout: 3,
      minPnlToCountAsDay: 200,
      maxFundedAccounts: 5,
      maxContracts: 4,
    })
  })

  it('uses verified Velocity, Premier+, and S2F numbers', () => {
    expect(firm.accountSizes.VELOCITY_25K).toMatchObject({
      target: 2500,
      drawdown: 1250,
      trailing: 'Intraday',
      minDays: 3,
      price: 79,
    })
    expect(firm.accountSizes.PREMIER_PLUS_25K).toMatchObject({
      target: 1500,
      drawdown: 1000,
      trailing: 'Intraday',
      minTradingDaysForPayout: 5,
      price: 114,
      maxContracts: 2,
    })
    expect(firm.accountSizes.S2F_50K).toMatchObject({
      evaluation: false,
      target: 3000,
      drawdown: 2000,
      trailing: 'EOD',
      consistency: 25,
      minTradingDaysForPayout: 7,
      price: 469,
      isRecursively: 'Unique',
    })
  })

  it('shows up when searching FFF, Family, or a plan name', () => {
    expect(propFirmMatchesSearch('fundedFuturesFamily', firm, 'fff')).toBe(true)
    expect(propFirmMatchesSearch('fundedFuturesFamily', firm, 'FFFamily')).toBe(
      true,
    )
    expect(propFirmMatchesSearch('fundedFuturesFamily', firm, 'family')).toBe(
      true,
    )
    expect(
      propFirmMatchesSearch('fundedFuturesFamily', firm, 'premier+'),
    ).toBe(true)
    expect(propFirmMatchesSearch('myFundedFutures', propFirms.myFundedFutures, 'fff')).toBe(
      false,
    )
    expect(
      propFirmMatchesSearch('myFundedFutures', propFirms.myFundedFutures, 'family'),
    ).toBe(false)
  })

  it('lists every FFF size when the query matches the firm, not a single size', () => {
    const sizes = getMatchingAccountSizes('fundedFuturesFamily', firm, 'FFF')
    expect(sizes.map(([key]) => key)).toEqual(Object.keys(firm.accountSizes))
  })
})
