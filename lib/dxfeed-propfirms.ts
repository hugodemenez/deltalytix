/**
 * DxFeed / Volumetrica prop firms supported for import.
 *
 * Each firm uses its own subdomain on a shared Volumetrica stack:
 * - Trading (WebSocket): {tradingSubdomain}.{domain}
 * - Historical REST:     {historicalSubdomain}.{domain}
 *
 * Add new firms here as they are validated.
 */

export interface DxFeedPropFirmDefinition {
  /** Stable id stored in credentials (e.g. miltraders) */
  id: string
  /** Display name in UI */
  name: string
  /** Optional marketing / login site */
  website?: string
  /** Root domain for host construction (e.g. miltraders.com) */
  domain: string
  /** Historical API subdomain (default: volumetrica) */
  historicalSubdomain?: string
  /** Trading WSS subdomain (default: trading-volumetrica) */
  tradingSubdomain?: string
  /** When false, hidden from connect dropdown */
  enabled: boolean
}

export const DXFEED_PROP_FIRMS: DxFeedPropFirmDefinition[] = [
  {
    id: 'miltraders',
    name: 'Miltraders',
    website: 'https://miltraders.com',
    domain: 'miltraders.com',
    historicalSubdomain: 'volumetrica',
    tradingSubdomain: 'trading-volumetrica',
    enabled: true,
  },
  {
    id: 'phoenixtraderfunding',
    name: 'Phoenix Trader Funding',
    website: 'https://dxfeed.phoenixtraderfunding.com',
    domain: 'phoenixtraderfunding.com',
    historicalSubdomain: 'dxfeed',
    tradingSubdomain: 'trading-volumetrica',
    enabled: true,
  },
  {
    id: 'swissfirmup',
    name: 'SwissFirmUp',
    website: 'https://volumetrica.swissfirmup.com',
    domain: 'swissfirmup.com',
    historicalSubdomain: 'volumetrica',
    tradingSubdomain: 'trading-volumetrica',
    enabled: true,
  },
  // More Volumetrica-based firms can be added once their domain pattern is confirmed.
]

export function normalizeDxFeedPropfirmKey(name?: string | null): string {
  return (name ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function getDxFeedPropFirm(id?: string | null): DxFeedPropFirmDefinition | undefined {
  if (!id) return undefined
  const key = normalizeDxFeedPropfirmKey(id)
  return DXFEED_PROP_FIRMS.find(
    (f) => f.id === id || normalizeDxFeedPropfirmKey(f.id) === key || normalizeDxFeedPropfirmKey(f.name) === key,
  )
}

export function getDxFeedPropFirmByAuthName(
  propfirmName?: string | null,
): DxFeedPropFirmDefinition | undefined {
  const key = normalizeDxFeedPropfirmKey(propfirmName)
  if (!key) return undefined
  return DXFEED_PROP_FIRMS.find(
    (f) =>
      normalizeDxFeedPropfirmKey(f.name) === key ||
      normalizeDxFeedPropfirmKey(f.id) === key ||
      normalizeDxFeedPropfirmKey(f.domain.split('.')[0]) === key,
  )
}

export function getEnabledDxFeedPropFirms(): DxFeedPropFirmDefinition[] {
  return DXFEED_PROP_FIRMS.filter((f) => f.enabled)
}

export function buildHistoricalHostForPropFirm(firm: DxFeedPropFirmDefinition): string {
  const subdomain = firm.historicalSubdomain ?? 'volumetrica'
  return `https://${subdomain}.${firm.domain}`
}

export function buildTradingHostForPropFirm(firm: DxFeedPropFirmDefinition): string {
  const subdomain = firm.tradingSubdomain ?? 'trading-volumetrica'
  return `https://${subdomain}.${firm.domain}`
}

/** True when auth response propfirmName matches the user-selected firm. */
export function authPropfirmMatchesSelection(
  authPropfirmName: string | undefined | null,
  selectedFirm: DxFeedPropFirmDefinition,
): boolean {
  if (!authPropfirmName) return true

  const authKey = normalizeDxFeedPropfirmKey(authPropfirmName)
  const selectedKeys = new Set([
    normalizeDxFeedPropfirmKey(selectedFirm.id),
    normalizeDxFeedPropfirmKey(selectedFirm.name),
    normalizeDxFeedPropfirmKey(selectedFirm.domain.split('.')[0]),
  ])

  return selectedKeys.has(authKey)
}
