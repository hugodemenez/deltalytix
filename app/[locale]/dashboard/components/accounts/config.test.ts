import { describe, expect, it } from 'vitest'
import { propFirms } from './config'

describe('Funded Futures Family presets', () => {
  const firm = propFirms.fundedFuturesFamily

  it('is listed under its own name and is not Funded Futures Network or My Funded Futures', () => {
    expect(firm).toBeDefined()
    expect(firm.name).toBe('Funded Futures Family')
    expect(propFirms.myFundedFutures.name).toBe('My Funded Futures')
    expect(Object.keys(propFirms)).not.toContain('ffn')
    expect(Object.keys(propFirms)).not.toContain('fundedFuturesNetwork')
  })

  it('covers every currently published plan family and size', () => {
    expect(Object.keys(firm.accountSizes).sort()).toEqual([
      'BASE_2K',
      'BASE_2K_FUNDED',
      'PREMIER_EOD_100K_FUNDED',
      'PREMIER_EOD_150K_FUNDED',
      'PREMIER_EOD_25K_FUNDED',
      'PREMIER_EOD_50K_FUNDED',
      'PREMIER_FAST_EOD_100K',
      'PREMIER_FAST_EOD_150K',
      'PREMIER_FAST_EOD_25K',
      'PREMIER_FAST_EOD_50K',
      'PREMIER_FAST_INTRA_100K',
      'PREMIER_FAST_INTRA_150K',
      'PREMIER_FAST_INTRA_25K',
      'PREMIER_FAST_INTRA_50K',
      'PREMIER_INTRA_100K_FUNDED',
      'PREMIER_INTRA_150K_FUNDED',
      'PREMIER_INTRA_25K_FUNDED',
      'PREMIER_INTRA_50K_FUNDED',
      'PREMIER_STD_EOD_100K',
      'PREMIER_STD_EOD_150K',
      'PREMIER_STD_EOD_25K',
      'PREMIER_STD_EOD_50K',
      'PREMIER_STD_INTRA_100K',
      'PREMIER_STD_INTRA_150K',
      'PREMIER_STD_INTRA_25K',
      'PREMIER_STD_INTRA_50K',
      'PRIME_100K',
      'PRIME_100K_FUNDED',
      'PRIME_150K',
      'PRIME_150K_FUNDED',
      'PRIME_25K',
      'PRIME_25K_FUNDED',
      'PRIME_50K',
      'PRIME_50K_FUNDED',
      'PRIME_MAX_100K',
      'PRIME_MAX_150K',
      'PRIME_MAX_25K',
      'PRIME_MAX_50K',
      'S2F_100K',
      'S2F_150K',
      'S2F_25K',
      'S2F_50K',
      'S2F_ACCEL_50K',
      'VELOCITY_100K',
      'VELOCITY_100K_FUNDED',
      'VELOCITY_150K',
      'VELOCITY_150K_FUNDED',
      'VELOCITY_25K',
      'VELOCITY_25K_FUNDED',
      'VELOCITY_50K',
      'VELOCITY_50K_FUNDED',
      'VELOCITY_DAILY_100K_FUNDED',
      'VELOCITY_DAILY_150K_FUNDED',
      'VELOCITY_DAILY_25K_FUNDED',
      'VELOCITY_DAILY_50K_FUNDED',
    ])
  })

  it('uses the verified Prime Included 50K evaluation rules', () => {
    expect(firm.accountSizes.PRIME_50K).toMatchObject({
      balance: 50000,
      price: 179,
      target: 3000,
      drawdown: 2000,
      trailing: 'EOD',
      consistency: 100,
      dailyLoss: null,
      rulesDailyLoss: 'No',
      activationFees: 0,
      profitSharing: 90,
      tradingNewsAllowed: true,
      minDays: 1,
      minTradingDaysForPayout: 3,
      balanceRequired: 52100,
      minPnlToCountAsDay: 200,
      maxContracts: 4,
    })
  })

  it('uses the verified Velocity 25K evaluation and Daily Add-On funded rules', () => {
    expect(firm.accountSizes.VELOCITY_25K).toMatchObject({
      price: 79,
      target: 2500,
      drawdown: 1250,
      trailing: 'Intraday',
      consistency: 40,
      minDays: 3,
      maxPayout: '$750 per request',
    })
    expect(firm.accountSizes.VELOCITY_DAILY_25K_FUNDED).toMatchObject({
      price: 108,
      target: 1500,
      drawdown: 1250,
      trailing: 'Intraday',
      consistency: 100,
      minTradingDaysForPayout: 0,
      maxPayout: '$600 per request',
      minPnlToCountAsDay: 0,
    })
  })

  it('uses the verified Premier+ FastPass EOD 150K and S2F Accelerate 50K rules', () => {
    expect(firm.accountSizes.PREMIER_FAST_EOD_150K).toMatchObject({
      price: 529,
      target: 9000,
      drawdown: 4000,
      trailing: 'EOD',
      consistency: 100,
      minDays: 1,
      maxContracts: 10,
    })
    expect(firm.accountSizes.S2F_ACCEL_50K).toMatchObject({
      price: 499,
      evaluation: false,
      drawdown: 2000,
      trailing: 'Intraday',
      consistency: 25,
      minTradingDaysForPayout: 5,
      maxPayout: '$1,250 first two / $1,500 after',
      maxContracts: 5,
    })
  })

  it('leaves unpublished Base monthly price at the same 0 fallback other firms use', () => {
    expect(firm.accountSizes.BASE_2K).toMatchObject({
      balance: 2000,
      price: 0,
      priceWithPromo: 0,
      target: 3000,
      drawdown: 2000,
      trailing: 'EOD',
      consistency: 40,
      maxContracts: 5,
    })
    expect(firm.accountSizes.BASE_2K_FUNDED).toMatchObject({
      trailing: 'Intraday',
      consistency: 100,
      balanceRequired: 4000,
      minPayout: 500,
      maxPayout: '$1,000',
      maxContracts: 15,
    })
  })

  it('applies firm-wide verified defaults on every size', () => {
    for (const size of Object.values(firm.accountSizes)) {
      expect(size.dailyLoss).toBeNull()
      expect(size.rulesDailyLoss).toBe('No')
      expect(size.activationFees).toBe(0)
      expect(size.profitSharing).toBe(90)
      expect(size.tradingNewsAllowed).toBe(true)
      expect(size.maxFundedAccounts).toBe(5)
      expect(size.priceWithPromo).toBe(size.price)
    }
  })
})
