/**
 * GitHub-hosted ubuntu-latest egresses from Azure. Unauthenticated
 * RequestRithmicSystemInfo usually works; RequestLogin often gets zero bytes
 * back from the same IPv4 peer. The TLS handshake can also reset
 * (`ECONNRESET` before WSS opens). In-app reconnect goes through Vercel and
 * works. Rithmic does not offer a customer IP allowlist.
 */
export function isSilentRithmicLoginTimeout(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('Rithmic login got no ResponseLogin') &&
    message.includes('inbound=0')
  )
}

function errorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  const record = error as { code?: unknown; cause?: { code?: unknown } }
  if (typeof record.code === 'string') return record.code
  if (typeof record.cause?.code === 'string') return record.cause.code
  return ''
}

/** Pre-protocol socket death while opening WSS to a Rithmic connect point. */
export function isRithmicConnectReset(error: unknown): boolean {
  const code = errorCode(error)
  if (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'EPIPE' ||
    code === 'EHOSTUNREACH'
  ) {
    return true
  }
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('disconnected before secure TLS') ||
    message.includes('Client network socket disconnected') ||
    message.includes('socket hang up')
  )
}

export function shouldSkipSilentGithubRithmicLogin(error: unknown): boolean {
  if (process.env.RITHMIC_PROTOCOL_E2E_REQUIRE_LOGIN === '1') return false
  if (process.env.GITHUB_ACTIONS !== 'true') return false
  return isSilentRithmicLoginTimeout(error) || isRithmicConnectReset(error)
}
