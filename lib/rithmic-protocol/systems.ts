/**
 * Rithmic R | Protocol API gateway + known system names.
 *
 * Per Rithmic guidance, clients connect with wss:// to the Protocol server
 * (currently Test: wss://rituz00100.rithmic.com:443), then choose a
 * system_name at login (e.g. "Rithmic Test"). Gateway is never user-edited.
 */

/** Bootstrap / Test Protocol endpoint from Rithmic. */
export const RITHMIC_PROTOCOL_TEST_URI = 'wss://rituz00100.rithmic.com:443'

/** Fallback when RequestRithmicSystemInfo is unavailable. */
export const RITHMIC_PROTOCOL_FALLBACK_SYSTEMS = ['Rithmic Test'] as const

export const RITHMIC_PROTOCOL_SYSTEMS = RITHMIC_PROTOCOL_FALLBACK_SYSTEMS.map(
  (systemName) => ({
    systemName,
    gatewayUri: RITHMIC_PROTOCOL_TEST_URI,
  }),
)

export function getDefaultRithmicProtocolUri(): string {
  return (
    process.env.RITHMIC_PROTOCOL_URI?.trim() || RITHMIC_PROTOCOL_TEST_URI
  )
}

export function getRithmicProtocolAppName(): string {
  return (
    process.env.RITHMIC_PROTOCOL_APP_NAME?.trim() ||
    'DeltalytixRithmicProtocolAPI'
  )
}

export function getRithmicProtocolAppVersion(): string {
  return process.env.RITHMIC_PROTOCOL_APP_VERSION?.trim() || '0.1.0'
}

/**
 * Resolve the Protocol websocket URI from env / Rithmic Test default.
 * Not user-editable — system_name is chosen separately at login.
 */
export function resolveGatewayUri(_systemName?: string): string {
  return normalizeGatewayUri(getDefaultRithmicProtocolUri())
}

export function normalizeGatewayUri(uri: string): string {
  if (uri.startsWith('wss://') || uri.startsWith('ws://')) return uri
  return `wss://${uri.replace(/^\/\//, '')}`
}
