/**
 * GitHub-hosted ubuntu-latest egresses from Azure. Unauthenticated
 * RequestRithmicSystemInfo works; RequestLogin often gets zero bytes back
 * from the same IPv4 peer. In-app reconnect goes through Vercel and works.
 * Rithmic does not offer a customer IP allowlist.
 */
export function isSilentRithmicLoginTimeout(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('Rithmic login got no ResponseLogin') &&
    message.includes('inbound=0')
  )
}

export function shouldSkipSilentGithubRithmicLogin(error: unknown): boolean {
  if (process.env.RITHMIC_PROTOCOL_E2E_REQUIRE_LOGIN === '1') return false
  if (process.env.GITHUB_ACTIONS !== 'true') return false
  return isSilentRithmicLoginTimeout(error)
}
