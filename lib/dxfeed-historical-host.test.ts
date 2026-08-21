import { describe, expect, it } from 'vitest'
import { normalizeDxFeedHistoricalHost } from './dxfeed-historical-host'

describe('normalizeDxFeedHistoricalHost', () => {
  it('keeps a full https origin', () => {
    expect(normalizeDxFeedHistoricalHost('https://dxfeed.hyperticks.com/')).toBe(
      'https://dxfeed.hyperticks.com',
    )
  })

  it('adds https when the value is a hostname', () => {
    expect(normalizeDxFeedHistoricalHost('dxfeed.hyperticks.com')).toBe(
      'https://dxfeed.hyperticks.com',
    )
  })
})
