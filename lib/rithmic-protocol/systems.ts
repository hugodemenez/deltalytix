/**
 * Known Rithmic systems and default Protocol API gateways.
 * Override with RITHMIC_PROTOCOL_URI or per-connection gatewayUri.
 */
export const RITHMIC_PROTOCOL_SYSTEMS = [
  {
    systemName: 'Rithmic Test',
    gatewayUri: 'wss://rituz00100.rithmic.com:443',
  },
  {
    systemName: 'Rithmic Paper Trading',
    // Common Protocol gateway; override via env / UI if your FCM uses another PoP.
    gatewayUri: 'wss://rprotocol.rithmic.com:443',
  },
  {
    systemName: 'Rithmic 01',
    gatewayUri: 'wss://rprotocol.rithmic.com:443',
  },
] as const

export function getDefaultRithmicProtocolUri(): string {
  return (
    process.env.RITHMIC_PROTOCOL_URI?.trim() ||
    RITHMIC_PROTOCOL_SYSTEMS[0].gatewayUri
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

export function resolveGatewayUri(
  systemName: string,
  explicitUri?: string | null,
): string {
  if (explicitUri?.trim()) return normalizeGatewayUri(explicitUri.trim())
  const known = RITHMIC_PROTOCOL_SYSTEMS.find((s) => s.systemName === systemName)
  if (known) return known.gatewayUri
  return getDefaultRithmicProtocolUri()
}

export function normalizeGatewayUri(uri: string): string {
  if (uri.startsWith('wss://') || uri.startsWith('ws://')) return uri
  return `wss://${uri.replace(/^\/\//, '')}`
}
