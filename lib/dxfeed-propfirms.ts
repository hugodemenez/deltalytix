/**
 * Detect the DxFeed / Volumetrica prop firm from the historical host
 * returned by shared auth (`tradingRestReportHost`). There is no allowlist.
 */

import { normalizeDxFeedHistoricalHost } from './dxfeed-historical-host'

export interface DxFeedDetectedPropFirm {
  /** Stable id stored in credentials (e.g. hyperticks) */
  id: string
  /** Display name in UI */
  name: string
}

const SERVICE_LABELS = new Set([
  'dxfeed',
  'volumetrica',
  'trading',
  'trading-dxfeed',
  'trading-volumetrica',
  'www',
  'api',
  'platform',
  'login',
  'app',
  'dashboard',
])

const INFRA_SUFFIXES = ['volumetricaprop.com', 'volumetricatrading.com']

export function normalizeDxFeedPropfirmKey(name?: string | null): string {
  return (name ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function formatDxFeedPropFirmName(id: string): string {
  if (!id) return 'DxFeed'
  return id.charAt(0).toUpperCase() + id.slice(1)
}

function pickFirmLabel(labels: string[]): string | null {
  const meaningful = labels.filter((label) => label && !SERVICE_LABELS.has(label))
  return meaningful[0] ?? null
}

/**
 * Derive prop firm id/name from the auth-returned historical host.
 * `https://dxfeed.hyperticks.com` and `https://hyperticks.volumetricaprop.com`
 * both resolve to Hyperticks.
 */
export function detectDxFeedPropFirmFromHost(
  host?: string | null,
): DxFeedDetectedPropFirm | null {
  const normalized = normalizeDxFeedHistoricalHost(host)
  if (!normalized) return null

  let hostname: string
  try {
    hostname = new URL(normalized).hostname.toLowerCase()
  } catch {
    return null
  }

  for (const suffix of INFRA_SUFFIXES) {
    if (hostname === suffix || hostname.endsWith(`.${suffix}`)) {
      const prefix =
        hostname === suffix ? '' : hostname.slice(0, -(suffix.length + 1))
      const id = pickFirmLabel(prefix.split('.'))
      return id ? { id, name: formatDxFeedPropFirmName(id) } : null
    }
  }

  const labels = hostname.split('.').filter(Boolean)
  if (labels.length < 2) return null

  const id = pickFirmLabel(labels.slice(0, -1))
  return id ? { id, name: formatDxFeedPropFirmName(id) } : null
}
