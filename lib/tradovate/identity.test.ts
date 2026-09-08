import { describe, expect, it } from 'vitest'
import {
  normalizeTradovateFillId,
  normalizeTradeSide,
  resolveTradovatePersistedId,
  tradovateFillIdLookupValues,
  tradovateFillPairKey,
  tradovateRoundTripFillIds,
  tradovateSideFromBuyFirst,
} from './identity'

describe('normalizeTradovateFillId', () => {
  it('strips an optional fill_ prefix and leaves raw ids alone', () => {
    expect(normalizeTradovateFillId('fill_88451221')).toBe('88451221')
    expect(normalizeTradovateFillId('FILL_88451221')).toBe('88451221')
    expect(normalizeTradovateFillId('88451221')).toBe('88451221')
    expect(normalizeTradovateFillId('  fill_88451221  ')).toBe('88451221')
  })
})

describe('normalizeTradeSide', () => {
  it('lowercases Long/Short from sync and long/short from CSV', () => {
    expect(normalizeTradeSide('Long')).toBe('long')
    expect(normalizeTradeSide('short')).toBe('short')
    expect(normalizeTradeSide(' Short ')).toBe('short')
  })
})

describe('tradovateRoundTripFillIds', () => {
  it('uses buy then sell for longs and sell then buy for shorts', () => {
    expect(
      tradovateRoundTripFillIds({
        buyFillId: 'fill_1',
        sellFillId: 2,
        isBuyFirst: true,
      }),
    ).toEqual({ entryId: '1', closeId: '2' })
    expect(
      tradovateRoundTripFillIds({
        buyFillId: 1,
        sellFillId: 'fill_2',
        isBuyFirst: false,
      }),
    ).toEqual({ entryId: '2', closeId: '1' })
  })
})

describe('tradovateFillPairKey', () => {
  it('is stable across prefix and entry/close swap', () => {
    expect(
      tradovateFillPairKey({
        accountNumber: 'ACC',
        entryId: 'fill_1',
        closeId: '2',
      }),
    ).toBe(
      tradovateFillPairKey({
        accountNumber: 'ACC',
        entryId: '2',
        closeId: '1',
      }),
    )
  })

  it('looks up both raw and prefixed fill ids', () => {
    expect(tradovateFillIdLookupValues('fill_1')).toEqual(['1', 'fill_1'])
    expect(tradovateSideFromBuyFirst(true)).toBe('Long')
  })
})

describe('resolveTradovatePersistedId', () => {
  it('returns the existing row when the fill pair matches another account format', () => {
    expect(
      resolveTradovatePersistedId(
        { accountNumber: 'ACC', entryId: '1', closeId: '2' },
        [
          {
            id: 'legacy-sync',
            accountNumber: 'ACC',
            entryId: 'fill_2',
            closeId: 'fill_1',
          },
        ],
      ),
    ).toBe('legacy-sync')
  })

  it('does not reuse a row from a different account', () => {
    expect(
      resolveTradovatePersistedId(
        { accountNumber: 'ACC-A', entryId: '1', closeId: '2' },
        [
          {
            id: 'other-account',
            accountNumber: 'ACC-B',
            entryId: '1',
            closeId: '2',
          },
        ],
      ),
    ).toBeUndefined()
  })
})
