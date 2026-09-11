import { describe, expect, it } from 'vitest'
import {
  COMMISSION_FILL_RATE_BIT,
  commissionForFillQuantity,
  indexProductRmsCommissionRates,
  lookupCommissionFillRate,
  mapProductRmsCommissionRow,
} from './commission-rates'

describe('mapProductRmsCommissionRow', () => {
  it('keeps a rate when the commission presence bit is set, including zero', () => {
    expect(
      mapProductRmsCommissionRow({
        accountId: 'ACC1',
        productCode: 'mes',
        commissionFillRate: 0,
        presenceBits: COMMISSION_FILL_RATE_BIT,
      }),
    ).toEqual({
      accountId: 'ACC1',
      productCode: 'MES',
      commissionFillRate: 0,
    })
  })

  it('keeps a finite rate when presence bits are omitted', () => {
    expect(
      mapProductRmsCommissionRow({
        accountId: 'ACC1',
        productCode: 'MNQ',
        commissionFillRate: 1.24,
      }),
    ).toMatchObject({ commissionFillRate: 1.24, productCode: 'MNQ' })
  })

  it('drops a row when presence bits are set without the commission bit', () => {
    expect(
      mapProductRmsCommissionRow({
        accountId: 'ACC1',
        productCode: 'ES',
        commissionFillRate: 2.5,
        presenceBits: 1,
      }),
    ).toBeNull()
  })

  it('drops rows without an account, product, or finite rate', () => {
    expect(
      mapProductRmsCommissionRow({
        productCode: 'ES',
        commissionFillRate: 1,
      }),
    ).toBeNull()
    expect(
      mapProductRmsCommissionRow({
        accountId: 'ACC1',
        commissionFillRate: 1,
      }),
    ).toBeNull()
    expect(
      mapProductRmsCommissionRow({
        accountId: 'ACC1',
        productCode: 'ES',
        commissionFillRate: Number.NaN,
      }),
    ).toBeNull()
  })
})

describe('lookupCommissionFillRate', () => {
  const rates = indexProductRmsCommissionRates([
    { accountId: 'ACC1', productCode: 'MES', commissionFillRate: 1.2 },
  ])

  it('returns the per-product fill rate', () => {
    expect(lookupCommissionFillRate(rates, 'ACC1', 'MES')).toBe(1.2)
  })

  it('returns 0 when the product or map is missing', () => {
    expect(lookupCommissionFillRate(rates, 'ACC1', 'ES')).toBe(0)
    expect(lookupCommissionFillRate(undefined, 'ACC1', 'MES')).toBe(0)
  })

  it('charges rate × fill quantity, same as the Rithmic Orders CSV path', () => {
    expect(commissionForFillQuantity(rates, 'ACC1', 'MES', 2)).toBe(2.4)
    expect(commissionForFillQuantity(rates, 'ACC1', 'ES', 2)).toBe(0)
  })
})
