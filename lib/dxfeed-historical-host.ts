/**
 * Resolves the DxFeed historical REST API base URL.
 * Hosts are defined per prop firm in lib/dxfeed-propfirms.ts.
 */

import {
  buildHistoricalHostForPropFirm,
  buildTradingHostForPropFirm,
  getDxFeedPropFirm,
  getDxFeedPropFirmByAuthName,
  type DxFeedPropFirmDefinition,
} from '@/lib/dxfeed-propfirms'

export function normalizeDxFeedHistoricalHost(value?: string | null): string {
  if (!value) return ''

  try {
    const parsed = new URL(value.startsWith('http') ? value : `https://${value}`)
    return `${parsed.protocol}//${parsed.host}`.replace(/\/$/, '')
  } catch {
    return value.replace(/\/$/, '')
  }
}

export interface DxFeedHistoricalHostAuthHints {
  tradingRestReportHost?: string | null
  propfirmName?: string | null
}

export interface ResolveDxFeedHistoricalHostOptions {
  /** User-selected prop firm from connect UI */
  propFirmId?: string | null
}

export function resolveDxFeedHistoricalHost(
  authData: DxFeedHistoricalHostAuthHints,
  _responseHeaders?: { get(name: string): string | null },
  options?: ResolveDxFeedHistoricalHostOptions,
): string {
  const fromAuth = normalizeDxFeedHistoricalHost(authData.tradingRestReportHost)
  if (fromAuth) return fromAuth

  const firm =
    getDxFeedPropFirm(options?.propFirmId) ?? getDxFeedPropFirmByAuthName(authData.propfirmName)

  if (firm) {
    return buildHistoricalHostForPropFirm(firm)
  }

  return ''
}

/**
 * Older connections sometimes stored the trading WSS host instead of the historical REST host.
 * Trading hosts return 404 on /api/historical/* — remap to the catalog historical host.
 */
export function coerceDxFeedHistoricalHostForSync(
  storedHost: string | null | undefined,
  propFirm: DxFeedPropFirmDefinition,
): string {
  const catalogHistorical = buildHistoricalHostForPropFirm(propFirm)
  const normalized = normalizeDxFeedHistoricalHost(storedHost)
  if (!normalized) return catalogHistorical

  const tradingHost = normalizeDxFeedHistoricalHost(buildTradingHostForPropFirm(propFirm))
  if (normalized === tradingHost) return catalogHistorical

  try {
    const hostname = new URL(normalized).hostname
    const tradingSubdomain = propFirm.tradingSubdomain ?? 'trading-volumetrica'
    if (hostname.startsWith(`${tradingSubdomain}.`)) {
      return catalogHistorical
    }
  } catch {
    if (normalized.includes('trading-volumetrica')) {
      return catalogHistorical
    }
  }

  return normalized
}
