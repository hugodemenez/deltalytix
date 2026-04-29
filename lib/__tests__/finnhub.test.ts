import { describe, it, expect } from 'vitest'
import { resolveSymbol, FUTURES_SYMBOL_MAP } from '../finnhub'

describe('resolveSymbol', () => {
  // ── Exact matches ──────────────────────────────────────────────────────────────

  it('resolves ES → ES1!', () => {
    expect(resolveSymbol('ES')).toBe('ES1!')
  })

  it('resolves MNQ → NQ1!', () => {
    expect(resolveSymbol('MNQ')).toBe('NQ1!')
  })

  it('resolves MES → ES1!', () => {
    expect(resolveSymbol('MES')).toBe('ES1!')
  })

  it('resolves CL → CL1!', () => {
    expect(resolveSymbol('CL')).toBe('CL1!')
  })

  it('resolves GC → GC1!', () => {
    expect(resolveSymbol('GC')).toBe('GC1!')
  })

  it('resolves ZN → ZN1!', () => {
    expect(resolveSymbol('ZN')).toBe('ZN1!')
  })

  it('resolves 6E → 6E1!', () => {
    expect(resolveSymbol('6E')).toBe('6E1!')
  })

  it('resolves BTC → BTCUSDT', () => {
    expect(resolveSymbol('BTC')).toBe('BTCUSDT')
  })

  // ── Expiry suffix stripping ────────────────────────────────────────────────

  it('strips expiry: ESM25 → ES1!', () => {
    expect(resolveSymbol('ESM25')).toBe('ES1!')
  })

  it('strips expiry: NQZ24 → NQ1!', () => {
    expect(resolveSymbol('NQZ24')).toBe('NQ1!')
  })

  it('strips expiry: CLH26 → CL1!', () => {
    expect(resolveSymbol('CLH26')).toBe('CL1!')
  })

  it('strips expiry: MGC U25 without space → MGC1!', () => {
    expect(resolveSymbol('MGCU25')).toBe('GC1!')
  })

  // ── Case insensitivity ─────────────────────────────────────────────────────

  it('handles lowercase input: es → ES1!', () => {
    expect(resolveSymbol('es')).toBe('ES1!')
  })

  it('handles mixed case: MnQ → NQ1!', () => {
    expect(resolveSymbol('MnQ')).toBe('NQ1!')
  })

  // ── Unknown symbols ────────────────────────────────────────────────────────

  it('returns uppercased original for unknown symbol', () => {
    expect(resolveSymbol('AAPL')).toBe('AAPL')
  })

  it('returns uppercased original for empty-like input', () => {
    expect(resolveSymbol('XYZ999')).toBe('XYZ999')
  })
})

describe('FUTURES_SYMBOL_MAP completeness', () => {
  it('contains all major equity index futures', () => {
    const equityFutures = ['MES', 'ES', 'MNQ', 'NQ', 'MYM', 'YM', 'M2K', 'RTY']
    equityFutures.forEach((sym) => {
      expect(FUTURES_SYMBOL_MAP[sym]).toBeDefined()
    })
  })

  it('contains energy futures', () => {
    ;['CL', 'MCL', 'NG'].forEach((sym) => {
      expect(FUTURES_SYMBOL_MAP[sym]).toBeDefined()
    })
  })

  it('contains metals futures', () => {
    ;['GC', 'MGC', 'SI', 'SIL', 'HG'].forEach((sym) => {
      expect(FUTURES_SYMBOL_MAP[sym]).toBeDefined()
    })
  })

  it('contains FX futures', () => {
    ;['6E', '6J', '6B', '6A', '6C', '6S'].forEach((sym) => {
      expect(FUTURES_SYMBOL_MAP[sym]).toBeDefined()
    })
  })

  it('contains rates futures', () => {
    ;['ZN', 'ZB', 'ZF', 'ZT'].forEach((sym) => {
      expect(FUTURES_SYMBOL_MAP[sym]).toBeDefined()
    })
  })

  it('all values are non-empty strings', () => {
    Object.entries(FUTURES_SYMBOL_MAP).forEach(([key, value]) => {
      expect(typeof value).toBe('string')
      expect(value.length).toBeGreaterThan(0)
    })
  })

  it('no duplicate values for different asset classes', () => {
    // Micro and full contracts CAN share a value (MES=ES=ES1!) - that is by design
    // But verify no typos map different assets to the same symbol accidentally
    const energyValues  = ['CL', 'MCL', 'NG'].map((k) => FUTURES_SYMBOL_MAP[k])
    const metalValues   = ['GC', 'MGC', 'SI'].map((k) => FUTURES_SYMBOL_MAP[k])
    const intersection  = energyValues.filter((v) => metalValues.includes(v))
    expect(intersection).toHaveLength(0)
  })
})
