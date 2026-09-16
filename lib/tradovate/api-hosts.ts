/**
 * NinjaTrader Dynamic API Hosts.
 *
 * Auth responses (`accessTokenRequest`, OAuth/social token, `renewAccessToken`,
 * …) may include `apiHosts`. Eval/demo orgs can get dedicated hostnames; a
 * client that always calls demo.tradovateapi.com will see REST 307s and
 * WebSocket 421s after the 3 Oct 2026 changeover.
 *
 * @see https://docs.ninjatrader.com/api/dynamic-api-hosts
 */

export type TradovateEnvironment = 'demo' | 'live'

export type TradovateHostPurpose =
  | 'trading'
  | 'marketData'
  | 'replay'
  | 'reporting'

/**
 * Hosts returned at authentication. All fields are optional at the type level
 * (`apiHosts` is omitted on errors and MFA). Unknown keys are ignored by
 * routing but preserved when parsing so newer NT fields round-trip.
 */
export type TradovateApiHosts = {
  live?: string
  demo?: string
  mdLive?: string
  mdDemo?: string
  replay?: string
  reportingLive?: string
  reportingDemo?: string
  adminLive?: string
  adminDemo?: string
  mdAdminLive?: string
  mdAdminDemo?: string
  [key: string]: string | undefined
}

export type TradovateHostContext = {
  environment?: TradovateEnvironment
  apiHosts?: TradovateApiHosts | null
}

export type TradovateEnvInput = TradovateEnvironment | TradovateHostContext

/** Shared environment fallbacks used when `apiHosts` is omitted. */
export const TRADOVATE_FALLBACK_HOSTS = {
  live: 'live.tradovateapi.com',
  demo: 'demo.tradovateapi.com',
  mdLive: 'md.tradovateapi.com',
  mdDemo: 'md-demo.tradovateapi.com',
  replay: 'replay.tradovateapi.com',
} as const

export const TRADOVATE_OAUTH_AUTHORIZE_ORIGIN = 'https://trader.tradovate.com'

const PURPOSE_FIELD: Record<
  TradovateHostPurpose,
  Record<TradovateEnvironment, keyof typeof TRADOVATE_FALLBACK_HOSTS | 'reportingLive' | 'reportingDemo'>
> = {
  trading: { demo: 'demo', live: 'live' },
  marketData: { demo: 'mdDemo', live: 'mdLive' },
  replay: { demo: 'replay', live: 'replay' },
  reporting: { demo: 'reportingDemo', live: 'reportingLive' },
}

export function normalizeTradovateEnvironment(
  value: unknown,
): TradovateEnvironment {
  return value === 'live' ? 'live' : 'demo'
}

/** `host` or `host:port` only. Rejects userinfo (`user@host`) so a hostname we
 * persist can never redirect a bearer token somewhere else. */
const HOSTNAME_PATTERN = /^[a-z0-9.-]+(:\d+)?$/i

/** Strip a scheme/path so we always store the bare hostname NT returns. */
export function normalizeTradovateHostname(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (trimmed.includes('://')) {
    try {
      const url = new URL(trimmed)
      // `url.host` already drops userinfo, but validate anyway.
      return HOSTNAME_PATTERN.test(url.host) ? url.host : null
    } catch {
      return null
    }
  }

  const host = trimmed.replace(/\/+$/, '').split('/')[0]?.trim()
  if (!host || !HOSTNAME_PATTERN.test(host)) return null
  return host
}

/**
 * Hosts we will re-attach an `Authorization` header to when NT answers a REST
 * call with a cross-host 307. The auth-returned `apiHosts` object is trusted on
 * its own merits (it arrives over TLS from an authenticated call); a `Location`
 * header is only as trustworthy as the host that sent it, so gate it.
 */
export const TRADOVATE_TRUSTED_HOST_SUFFIXES = [
  'tradovateapi.com',
  'tradovate.com',
  'ninjatrader.com',
] as const

export function isTrustedTradovateHost(hostname: string): boolean {
  const host = normalizeTradovateHostname(hostname)
  if (!host) return false
  const bare = host.split(':')[0]!.toLowerCase()
  return TRADOVATE_TRUSTED_HOST_SUFFIXES.some(
    (suffix) => bare === suffix || bare.endsWith(`.${suffix}`),
  )
}

/**
 * Parse an `apiHosts` object. Non-string and empty values are dropped.
 * Unknown fields are kept. Returns null when nothing usable remains so
 * callers fall back to the shared environment map.
 */
export function parseTradovateApiHosts(
  value: unknown,
): TradovateApiHosts | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const result: TradovateApiHosts = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== 'string') continue
    const host = normalizeTradovateHostname(raw)
    if (!host) continue
    result[key] = host
  }

  return Object.keys(result).length > 0 ? result : null
}

export function readApiHostsFromAuthResponse(
  body: unknown,
): TradovateApiHosts | null {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return null
  }
  const record = body as Record<string, unknown>
  return parseTradovateApiHosts(record.apiHosts ?? record.api_hosts)
}

/**
 * Re-read hosts on every authenticate/renew.
 *
 * Returned fields overwrite what we stored, field by field. A body that names
 * only some hosts must not drop the others: `resolveTradovateHostname` falls
 * back per field, so dropping a known `live` would silently send that traffic
 * back to the shared host — the 307 this module exists to avoid. Omitted
 * `apiHosts` (errors, MFA) keeps the previous hosts untouched.
 */
export function hostsAfterAuthResponse(
  previous: TradovateApiHosts | null | undefined,
  body: unknown,
): TradovateApiHosts | null {
  const known = parseTradovateApiHosts(previous)
  const incoming = readApiHostsFromAuthResponse(body)
  if (!incoming) return known
  if (!known) return incoming
  return { ...known, ...incoming }
}

/** The `apiHosts` field a purpose reads in a given environment. */
export function hostFieldForPurpose(
  purpose: TradovateHostPurpose,
  environment: TradovateEnvironment,
): string {
  return PURPOSE_FIELD[purpose][environment]
}

/**
 * Record a host we learned outside the `apiHosts` object — today, the target of
 * a cross-host 307. Lets a connection created before the changeover reach the
 * right host on its next call instead of re-redirecting every time.
 */
export function withTradovateHost(
  hosts: TradovateApiHosts | null | undefined,
  purpose: TradovateHostPurpose,
  environment: TradovateEnvironment,
  hostname: string,
): TradovateApiHosts | null {
  const known = parseTradovateApiHosts(hosts)
  const host = normalizeTradovateHostname(hostname)
  if (!host) return known
  return { ...(known ?? {}), [hostFieldForPurpose(purpose, environment)]: host }
}

export function normalizeHostContext(
  input: TradovateEnvInput = 'demo',
): { environment: TradovateEnvironment; apiHosts: TradovateApiHosts | null } {
  if (typeof input === 'string') {
    return {
      environment: normalizeTradovateEnvironment(input),
      apiHosts: null,
    }
  }
  return {
    environment: normalizeTradovateEnvironment(input.environment),
    apiHosts: parseTradovateApiHosts(input.apiHosts),
  }
}

function fallbackHostname(
  field: string,
  environment: TradovateEnvironment,
): string {
  if (field in TRADOVATE_FALLBACK_HOSTS) {
    return TRADOVATE_FALLBACK_HOSTS[field as keyof typeof TRADOVATE_FALLBACK_HOSTS]
  }
  return TRADOVATE_FALLBACK_HOSTS[environment]
}

/**
 * Pick the hostname for a request purpose. Auth-returned values win,
 * including `live`. Missing `apiHosts` (or a missing field) uses the
 * historical shared-environment map.
 */
export function resolveTradovateHostname(
  purpose: TradovateHostPurpose,
  environment: TradovateEnvironment = 'demo',
  apiHosts?: TradovateApiHosts | null,
): string {
  const field = PURPOSE_FIELD[purpose][environment]
  const fromAuth = apiHosts?.[field]
  if (fromAuth) return fromAuth
  return fallbackHostname(field, environment)
}

export function tradovateRestBaseUrl(
  purpose: TradovateHostPurpose,
  environment: TradovateEnvironment = 'demo',
  apiHosts?: TradovateApiHosts | null,
): string {
  return `https://${resolveTradovateHostname(purpose, environment, apiHosts)}`
}

export function tradovateWebSocketBaseUrl(
  purpose: TradovateHostPurpose,
  environment: TradovateEnvironment = 'demo',
  apiHosts?: TradovateApiHosts | null,
): string {
  return `wss://${resolveTradovateHostname(purpose, environment, apiHosts)}`
}

export function tradovateTradingRestBaseUrl(
  input: TradovateEnvInput = 'demo',
): string {
  const { environment, apiHosts } = normalizeHostContext(input)
  return tradovateRestBaseUrl('trading', environment, apiHosts)
}
