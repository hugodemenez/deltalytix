/**
 * DxFeed exposes two different hosts for many prop firms:
 * - Trading (WebSocket): e.g. trading-volumetrica.miltraders.com
 * - Historical REST API: e.g. volumetrica.miltraders.com
 *
 * Auth may return propfirmName + tradingWss but omit tradingRestReportHost.
 */

export function normalizeDxFeedHistoricalHost(value?: string | null): string {
  if (!value) return ''

  try {
    const parsed = new URL(value.startsWith('http') ? value : `https://${value}`)
    return `${parsed.protocol}//${parsed.host}`.replace(/\/$/, '')
  } catch {
    return value.replace(/\/$/, '')
  }
}

function normalizePropfirmKey(name?: string | null): string {
  return (name ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Known prop firms → historical REST API base URL.
 * Keys match normalized propfirmName from auth (e.g. "Miltraders" → "miltraders").
 *
 * Prefer the trading-* WSS hostname heuristic when possible. Add entries here
 * (or via DXFEED_HISTORICAL_HOSTS env) when a firm uses a different pattern.
 */
export const DXFEED_PROPFIRM_HISTORICAL_HOSTS: Record<string, string> = {
  // miltraders: resolved via trading-* → https://* heuristic from tradingWss
}

function parseHistoricalHostsFromEnv(): Record<string, string> {
  const raw = process.env.DXFEED_HISTORICAL_HOSTS
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw) as Record<string, string>
    const result: Record<string, string> = {}
    for (const [key, host] of Object.entries(parsed)) {
      const normalized = normalizeDxFeedHistoricalHost(host)
      if (normalized) {
        result[normalizePropfirmKey(key)] = normalized
      }
    }
    return result
  } catch {
    return {}
  }
}

let cachedEnvHosts: Record<string, string> | null = null

function getEnvPropfirmHosts(): Record<string, string> {
  if (!cachedEnvHosts) {
    cachedEnvHosts = parseHistoricalHostsFromEnv()
  }
  return cachedEnvHosts
}

/**
 * Miltraders / Volumetrica pattern: trading-{rest} → https://{rest}
 */
function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url.startsWith('http') ? url : `wss://${url}`).hostname
  } catch {
    return null
  }
}

/**
 * Miltraders / Volumetrica pattern: trading-{rest} → https://{rest}
 */
export function historicalHostFromTradingWssHostname(wssUrl?: string | null): string {
  const hostname = wssUrl ? hostnameFromUrl(wssUrl) : null
  if (!hostname?.startsWith('trading-')) return ''

  return `https://${hostname.slice('trading-'.length)}`
}

/** Fix hosts saved before prop-firm mapping (trading-* used as historical base). */
export function remapMisconfiguredHistoricalHost(historicalHost?: string | null): string {
  return historicalHostFromTradingWssHostname(historicalHost)
}

export interface DxFeedHistoricalHostAuthHints {
  tradingRestReportHost?: string | null
  tradingWss?: string | null
  tradingWssEndpoint?: string | null
  propfirmName?: string | null
}

export function resolveDxFeedHistoricalHost(
  authData: DxFeedHistoricalHostAuthHints,
  responseHeaders?: { get(name: string): string | null },
): string {
  const fromAuth = normalizeDxFeedHistoricalHost(authData.tradingRestReportHost)
  if (fromAuth) return fromAuth

  const propfirmKey = normalizePropfirmKey(authData.propfirmName)
  const wssUrl =
    authData.tradingWss ||
    authData.tradingWssEndpoint ||
    responseHeaders?.get('wss') ||
    null

  if (propfirmKey) {
    const fromMap =
      DXFEED_PROPFIRM_HISTORICAL_HOSTS[propfirmKey] ||
      getEnvPropfirmHosts()[propfirmKey]
    const normalizedMap = normalizeDxFeedHistoricalHost(fromMap)
    if (normalizedMap) return normalizedMap
  }

  const fromWssHeuristic = historicalHostFromTradingWssHostname(wssUrl)
  if (fromWssHeuristic) return fromWssHeuristic

  const legacyBaseUrl = normalizeDxFeedHistoricalHost(
    process.env.DXFEED_BASEURL || process.env.DXFEED_BASE_URL,
  )
  if (legacyBaseUrl) return legacyBaseUrl

  // Last resort: same host as WSS (often wrong, but some setups use one host)
  if (wssUrl) {
    try {
      return `https://${new URL(wssUrl).hostname}`
    } catch {
      return ''
    }
  }

  return ''
}
