import { describe, expect, it } from 'vitest'
import {
  isDxFeedStoredCredentialsOutdated,
  parseDxFeedStoredCredentials,
  resolveDxFeedPropFirmFromStoredCredentials,
} from './dxfeed-stored-credentials'

describe('dxfeed-stored-credentials', () => {
  it('parses valid stored credentials JSON', () => {
    const historicalHost = 'https://volumetrica.miltraders.com' // pragma: allowlist secret
    const parsed = parseDxFeedStoredCredentials(
      JSON.stringify({
        accessToken: 'token',
        historicalHost,
      }),
    )

    expect(parsed).toEqual({
      accessToken: 'token',
      historicalHost,
    })
  })

  it('resolves prop firm from historical host when propFirmId is missing', () => {
    const credentials = {
      accessToken: 'token',
      historicalHost: 'https://volumetrica.miltraders.com', // pragma: allowlist secret
    }

    const firm = resolveDxFeedPropFirmFromStoredCredentials(credentials)
    expect(firm?.id).toBe('miltraders')
    expect(isDxFeedStoredCredentialsOutdated(credentials)).toBe(false)
  })

  it('marks credentials outdated when prop firm cannot be resolved', () => {
    const credentials = {
      accessToken: 'token',
      historicalHost: 'https://unknown.example.com',
    }

    expect(resolveDxFeedPropFirmFromStoredCredentials(credentials)).toBeUndefined()
    expect(isDxFeedStoredCredentialsOutdated(credentials)).toBe(true)
  })
})
