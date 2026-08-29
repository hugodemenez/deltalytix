import { afterEach, describe, expect, it } from 'vitest'
import {
  isSilentRithmicLoginTimeout,
  shouldSkipSilentGithubRithmicLogin,
} from './silent-login-timeout'

const silent = new Error(
  'Rithmic login got no ResponseLogin. Timed out waiting for Rithmic message after 30000ms (inbound=0, queued=0). GitHub-hosted runners egress from Azure.',
)

describe('silent Rithmic login timeout', () => {
  const originalActions = process.env.GITHUB_ACTIONS
  const originalRequire = process.env.RITHMIC_PROTOCOL_E2E_REQUIRE_LOGIN

  afterEach(() => {
    if (originalActions === undefined) delete process.env.GITHUB_ACTIONS
    else process.env.GITHUB_ACTIONS = originalActions
    if (originalRequire === undefined) {
      delete process.env.RITHMIC_PROTOCOL_E2E_REQUIRE_LOGIN
    } else {
      process.env.RITHMIC_PROTOCOL_E2E_REQUIRE_LOGIN = originalRequire
    }
  })

  it('matches inbound=0 login timeouts only', () => {
    expect(isSilentRithmicLoginTimeout(silent)).toBe(true)
    expect(
      isSilentRithmicLoginTimeout(
        new Error('Rithmic login rejected: invalid user or password'),
      ),
    ).toBe(false)
    expect(
      isSilentRithmicLoginTimeout(
        new Error('Rithmic login got no ResponseLogin. inbound=3'),
      ),
    ).toBe(false)
  })

  it('skips only on GitHub Actions unless REQUIRE_LOGIN=1', () => {
    process.env.GITHUB_ACTIONS = 'true'
    delete process.env.RITHMIC_PROTOCOL_E2E_REQUIRE_LOGIN
    expect(shouldSkipSilentGithubRithmicLogin(silent)).toBe(true)

    process.env.RITHMIC_PROTOCOL_E2E_REQUIRE_LOGIN = '1'
    expect(shouldSkipSilentGithubRithmicLogin(silent)).toBe(false)

    delete process.env.RITHMIC_PROTOCOL_E2E_REQUIRE_LOGIN
    delete process.env.GITHUB_ACTIONS
    expect(shouldSkipSilentGithubRithmicLogin(silent)).toBe(false)
  })
})
