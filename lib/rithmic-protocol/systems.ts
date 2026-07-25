/**
 * Rithmic R | Protocol API connect points + known system names.
 *
 * Clients open a `wss://` socket to a Protocol connect point, send
 * `RequestRithmicSystemInfo` to discover system names, then log in with the
 * chosen `system_name` (e.g. "Rithmic 01", "Rithmic Paper Trading").
 * All connect points listen on 443.
 */

/** Every Rithmic connect point listens on 443. */
const RITHMIC_PROTOCOL_PORT = 443

export type RithmicProtocolEnvironment = 'production' | 'test'

export interface RithmicProtocolGateway {
  /** Stable id persisted with the connection (never the raw host). */
  id: string
  /** Rithmic's own name for the connect point. */
  label: string
  host: string
  /** Every Rithmic connect point listens on 443; only local proxies differ. */
  port?: number
  environment: RithmicProtocolEnvironment
}

const RITHMIC_PROTOCOL_TEST_GATEWAY_ID = 'test'
export const RITHMIC_PROTOCOL_CORE_GATEWAY_ID = 'core'

/**
 * Production connect points issued by Rithmic after Protocol conformance,
 * plus the UAT/Test point used during conformance and local development.
 */
export const RITHMIC_PROTOCOL_GATEWAYS: readonly RithmicProtocolGateway[] = [
  {
    id: RITHMIC_PROTOCOL_CORE_GATEWAY_ID,
    label: 'Core (Chicago)',
    host: 'rprotocol.rithmic.com',
    environment: 'production',
  },
  {
    id: 'nyc',
    label: 'New York',
    host: 'rprotocol-nyc.rithmic.com',
    environment: 'production',
  },
  {
    id: 'colo75',
    label: 'Colo75 (Aurora)',
    host: 'rprotocol-colo75.rithmic.com',
    environment: 'production',
  },
  {
    id: 'br',
    label: 'Sao Paolo',
    host: 'rprotocol-br.rithmic.com',
    environment: 'production',
  },
  {
    id: 'ie',
    label: 'Ireland',
    host: 'rprotocol-ie.rithmic.com',
    environment: 'production',
  },
  {
    id: 'de',
    label: 'Frankfurt',
    host: 'rprotocol-de.rithmic.com',
    environment: 'production',
  },
  {
    id: 'za',
    label: 'Cape Town',
    host: 'rprotocol-za.rithmic.com',
    environment: 'production',
  },
  {
    id: 'in',
    label: 'Mumbai',
    host: 'rprotocol-in.rithmic.com',
    environment: 'production',
  },
  {
    id: 'sg',
    label: 'Singapore',
    host: 'rprotocol-sg.rithmic.com',
    environment: 'production',
  },
  {
    id: 'hk',
    label: 'Hong Kong',
    host: 'rprotocol-hk.rithmic.com',
    environment: 'production',
  },
  {
    id: 'kr',
    label: 'Seoul',
    host: 'rprotocol-kr.rithmic.com',
    environment: 'production',
  },
  {
    id: 'jp',
    label: 'Tokyo',
    host: 'rprotocol-jp.rithmic.com',
    environment: 'production',
  },
  {
    id: 'au',
    label: 'Sydney',
    host: 'rprotocol-au.rithmic.com',
    environment: 'production',
  },
  {
    id: RITHMIC_PROTOCOL_TEST_GATEWAY_ID,
    label: 'Rithmic Test (UAT)',
    host: 'rituz00100.rithmic.com',
    environment: 'test',
  },
]

export function gatewayUri(gateway: RithmicProtocolGateway): string {
  return `wss://${gateway.host}:${gateway.port ?? RITHMIC_PROTOCOL_PORT}`
}

const CORE_GATEWAY = RITHMIC_PROTOCOL_GATEWAYS.find(
  (gateway) => gateway.id === RITHMIC_PROTOCOL_CORE_GATEWAY_ID,
)!

/** Systems Rithmic exposes when `RequestRithmicSystemInfo` is unavailable. */
const TEST_SYSTEMS = ['Rithmic Test'] as const
const PRODUCTION_SYSTEMS = ['Rithmic Paper Trading', 'Rithmic 01'] as const

/** Match `rprotocol-nyc.rithmic.com`, `wss://…:443`, `https://…` — all forms Rithmic documents. */
function hostOf(value: string): string {
  return authorityOf(value).replace(/:.*$/, '')
}

function authorityOf(value: string): string {
  return value
    .trim()
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/^\/\//, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
}

function portOf(value: string): number | undefined {
  const port = Number(authorityOf(value).split(':')[1])
  return Number.isFinite(port) && port > 0 ? port : undefined
}

function findRithmicProtocolGateway(
  idOrUri: string | null | undefined,
): RithmicProtocolGateway | undefined {
  if (!idOrUri) return undefined
  const value = idOrUri.trim()
  if (!value) return undefined

  const byId = RITHMIC_PROTOCOL_GATEWAYS.find(
    (gateway) => gateway.id === value.toLowerCase(),
  )
  if (byId) return byId

  const host = hostOf(value)
  return RITHMIC_PROTOCOL_GATEWAYS.find(
    (gateway) => gateway.host.toLowerCase() === host,
  )
}

/**
 * Deployment default. `RITHMIC_PROTOCOL_URI` (a full URI or bare host) wins so a
 * deployment can point at a connect point we do not ship; otherwise
 * `RITHMIC_PROTOCOL_GATEWAY` names one of the known ids.
 */
function defaultGateway(): RithmicProtocolGateway {
  const uriOverride = process.env.RITHMIC_PROTOCOL_URI?.trim()
  if (uriOverride) {
    return (
      findRithmicProtocolGateway(uriOverride) ?? {
        id: 'custom',
        label: authorityOf(uriOverride),
        host: hostOf(uriOverride),
        port: portOf(uriOverride),
        environment: 'production',
      }
    )
  }
  return (
    findRithmicProtocolGateway(process.env.RITHMIC_PROTOCOL_GATEWAY) ??
    CORE_GATEWAY
  )
}

export function getDefaultRithmicProtocolGateway(): RithmicProtocolGateway {
  return defaultGateway()
}

/**
 * Resolve the connect point for a stored/selected value: a gateway id, a full
 * `wss://` URI, or a bare host. Unknown values fall back to the deployment
 * default so a stale stored host can never redirect a login somewhere else.
 */
export function resolveGateway(
  gatewayIdOrUri?: string | null,
): RithmicProtocolGateway {
  return findRithmicProtocolGateway(gatewayIdOrUri) ?? defaultGateway()
}

/**
 * Connect points offered in the UI. The UAT point stays available outside
 * production (and whenever a deployment opts in) so local/dev keeps working.
 */
export function listSelectableRithmicProtocolGateways(): RithmicProtocolGateway[] {
  const fallback = defaultGateway()
  const allowTest = isTestGatewayAllowed()
  const gateways = RITHMIC_PROTOCOL_GATEWAYS.filter(
    (gateway) => gateway.environment === 'production' || allowTest,
  )
  if (!gateways.some((gateway) => gateway.id === fallback.id)) {
    return [fallback, ...gateways]
  }
  return gateways
}

function isTestGatewayAllowed(): boolean {
  const flag = process.env.RITHMIC_PROTOCOL_ALLOW_TEST_GATEWAY?.trim().toLowerCase()
  if (flag) return flag === 'true' || flag === '1'
  if (defaultGateway().environment === 'test') return true
  return process.env.NODE_ENV !== 'production'
}

/** Static system names shown before `RequestRithmicSystemInfo` answers. */
export function getFallbackSystems(gatewayIdOrUri?: string | null): string[] {
  return resolveGateway(gatewayIdOrUri).environment === 'test'
    ? [...TEST_SYSTEMS]
    : [...PRODUCTION_SYSTEMS]
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

export function normalizeGatewayUri(uri: string): string {
  if (uri.startsWith('wss://') || uri.startsWith('ws://')) return uri
  // Rithmic documents the same connect points as https:// — Protocol needs wss://.
  const withoutScheme = uri.trim().replace(/^[a-z]+:\/\//i, '').replace(/^\/\//, '')
  return `wss://${withoutScheme}`
}
