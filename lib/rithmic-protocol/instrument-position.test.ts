import { describe, expect, it } from 'vitest'
import {
  instrumentPositionMapsEqual,
  mapInstrumentPnLUpdate,
} from './instrument-position'

describe('mapInstrumentPnLUpdate', () => {
  it('keeps the exact contract symbol and integer net quantity', () => {
    expect(
      mapInstrumentPnLUpdate({
        accountId: 'LFE050',
        symbol: 'MESZ6',
        netQuantity: 2,
        isSnapshot: true,
      }),
    ).toEqual({
      accountId: 'LFE050',
      symbol: 'MESZ6',
      exchange: undefined,
      netQuantity: 2,
    })
  })

  it('ignores live (non-snapshot) 450 pushes', () => {
    expect(
      mapInstrumentPnLUpdate({
        accountId: 'LFE050',
        symbol: 'MESZ6',
        netQuantity: 2,
        isSnapshot: false,
      }),
    ).toBeNull()
  })

  it('rejects a row without a symbol or account', () => {
    expect(
      mapInstrumentPnLUpdate({ accountId: 'LFE050', netQuantity: 1 }),
    ).toBeNull()
    expect(
      mapInstrumentPnLUpdate({ symbol: 'MESZ6', netQuantity: 1 }),
    ).toBeNull()
  })
})

describe('instrumentPositionMapsEqual', () => {
  it('treats an omitted symbol as flat 0', () => {
    expect(
      instrumentPositionMapsEqual(
        [{ accountId: 'A', symbol: 'MESZ6', netQuantity: 0 }],
        [],
        'A',
      ),
    ).toBe(true)
  })

  it('detects a moved book on the same exact symbol', () => {
    expect(
      instrumentPositionMapsEqual(
        [{ accountId: 'A', symbol: 'MESZ6', netQuantity: 2 }],
        [{ accountId: 'A', symbol: 'MESZ6', netQuantity: 0 }],
        'A',
      ),
    ).toBe(false)
  })

  it('does not mix contract months', () => {
    expect(
      instrumentPositionMapsEqual(
        [{ accountId: 'A', symbol: 'MESZ6', netQuantity: 2 }],
        [{ accountId: 'A', symbol: 'MESH7', netQuantity: 2 }],
        'A',
      ),
    ).toBe(false)
  })
})
