import { describe, expect, it } from 'vitest'
import {
  isDxFeedStoredCredentialsOutdated,
  parseDxFeedStoredCredentials,
  resolveDxFeedPropFirmFromStoredCredentials,
  withDxFeedAccountNumbers,
  withResolvedDxFeedPropFirmId,
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

  it('preserves migrated prop firm metadata when account numbers are refreshed', () => {
    const historicalHost = 'https://volumetrica.miltraders.com' // pragma: allowlist secret
    const legacyCredentials = {
      accessToken: 'token',
      historicalHost,
    }
    const propFirm = resolveDxFeedPropFirmFromStoredCredentials(legacyCredentials)

    expect(propFirm?.id).toBe('miltraders')

    const migratedCredentials = withResolvedDxFeedPropFirmId(legacyCredentials, propFirm!)
    const refreshedCredentials = withDxFeedAccountNumbers(
      migratedCredentials,
      historicalHost,
      ['A-100', 'A-200'],
    )

    expect(refreshedCredentials).toEqual({
      accessToken: 'token',
      historicalHost,
      accountNumbers: ['A-100', 'A-200'],
      propFirmId: 'miltraders',
      propfirmName: 'Miltraders',
    })
  })
})
