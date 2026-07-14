import { describe, expect, it } from 'vitest'
import { resolveDxFeedV2AuthUrl } from './dxfeed-auth'

describe('resolveDxFeedV2AuthUrl', () => {
  it('upgrades the legacy auth endpoint to v2', () => {
    expect(
      resolveDxFeedV2AuthUrl(
        'https://authdxfeed.volumetricatrading.com/api/auth/token',
      ),
    ).toBe('https://authdxfeed.volumetricatrading.com/api/v2/auth/token')
  })

  it('keeps the documented v2 endpoint', () => {
    expect(
      resolveDxFeedV2AuthUrl(
        'https://authdxfeed.volumetricatrading.com/api/v2/auth/token',
      ),
    ).toBe('https://authdxfeed.volumetricatrading.com/api/v2/auth/token')
  })

  it('rejects missing, malformed, or unexpected endpoints', () => {
    expect(resolveDxFeedV2AuthUrl()).toBeNull()
    expect(resolveDxFeedV2AuthUrl('not-a-url')).toBeNull()
    expect(
      resolveDxFeedV2AuthUrl('https://authdxfeed.volumetricatrading.com/api/other'),
    ).toBeNull()
  })
})
