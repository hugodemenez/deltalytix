import { describe, expect, it } from 'vitest'
import {
  ALL_INCLUDED_FEE_TYPES,
  DEFAULT_INCLUDED_FEE_TYPES,
  TRADOVATE_FEE_EXAMPLE,
  TRADOVATE_FEE_EXAMPLE_FILL,
  TRADOVATE_FEE_TYPE_KEYS,
  getTotalFeeFromFillFee,
  includedFeeTypesForExampleChoice,
  isTradovateFeePreferenceUnset,
  shouldPromptTradovateFeeExample,
  shouldShowTradovateFeeSettings,
  tradovateConnectionRowControls,
} from './fee-types'

describe('includedFeeTypesForExampleChoice', () => {
  it('maps commission-only to the default commission line', () => {
    expect(includedFeeTypesForExampleChoice('commission-only')).toEqual(
      DEFAULT_INCLUDED_FEE_TYPES
    )
    expect(includedFeeTypesForExampleChoice('commission-only').commission).toBe(
      true
    )
    for (const key of TRADOVATE_FEE_TYPE_KEYS) {
      if (key === 'commission') continue
      expect(includedFeeTypesForExampleChoice('commission-only')[key]).toBe(
        false
      )
    }
  })

  it('maps all-fees to every Tradovate fee line', () => {
    expect(includedFeeTypesForExampleChoice('all-fees')).toEqual(
      ALL_INCLUDED_FEE_TYPES
    )
    for (const key of TRADOVATE_FEE_TYPE_KEYS) {
      expect(includedFeeTypesForExampleChoice('all-fees')[key]).toBe(true)
    }
  })

  it('returns a copy so callers cannot mutate the shared default', () => {
    const commissionOnly = includedFeeTypesForExampleChoice('commission-only')
    commissionOnly.exchangeFee = true
    expect(DEFAULT_INCLUDED_FEE_TYPES.exchangeFee).toBe(false)
  })
})

describe('illustrative MNQ ×3 example totals', () => {
  it('commission-only is $2.34 and all-in is $5.70', () => {
    expect(
      getTotalFeeFromFillFee(
        TRADOVATE_FEE_EXAMPLE_FILL,
        includedFeeTypesForExampleChoice('commission-only')
      )
    ).toBeCloseTo(2.34, 2)
    expect(
      getTotalFeeFromFillFee(
        TRADOVATE_FEE_EXAMPLE_FILL,
        includedFeeTypesForExampleChoice('all-fees')
      )
    ).toBeCloseTo(5.7, 2)
    expect(TRADOVATE_FEE_EXAMPLE.instrument).toBe('MNQ')
    expect(TRADOVATE_FEE_EXAMPLE.quantity).toBe(3)
  })
})

describe('isTradovateFeePreferenceUnset', () => {
  it('treats null, undefined, and empty objects as unset', () => {
    expect(isTradovateFeePreferenceUnset(null)).toBe(true)
    expect(isTradovateFeePreferenceUnset(undefined)).toBe(true)
    expect(isTradovateFeePreferenceUnset({})).toBe(true)
  })

  it('treats an explicit commission-only save as set', () => {
    expect(isTradovateFeePreferenceUnset(DEFAULT_INCLUDED_FEE_TYPES)).toBe(
      false
    )
    expect(isTradovateFeePreferenceUnset(ALL_INCLUDED_FEE_TYPES)).toBe(false)
  })
})

describe('tradovate connection fee settings control', () => {
  it('is present on Tradovate rows and opens fee config', () => {
    expect(shouldShowTradovateFeeSettings('tradovate')).toBe(true)
    expect(tradovateConnectionRowControls('tradovate')).toEqual({
      showFeeSettings: true,
      feeSettingsOpens: 'fee-config',
    })
  })

  it('is absent on other brokers', () => {
    for (const service of ['rithmic', 'dxfeed', 'ibkr', 'ig', 'thor']) {
      expect(shouldShowTradovateFeeSettings(service)).toBe(false)
      expect(tradovateConnectionRowControls(service)).toEqual({
        showFeeSettings: false,
        feeSettingsOpens: null,
      })
    }
  })

  it('prompts the example picker only for Tradovate with unset fees', () => {
    expect(shouldPromptTradovateFeeExample('tradovate', null)).toBe(true)
    expect(
      shouldPromptTradovateFeeExample('tradovate', DEFAULT_INCLUDED_FEE_TYPES)
    ).toBe(false)
    expect(shouldPromptTradovateFeeExample('dxfeed', null)).toBe(false)
  })
})
