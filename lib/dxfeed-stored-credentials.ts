import type { DxFeedStoredCredentials } from '@/app/[locale]/dashboard/components/import/dxfeed/sync/dxfeed-types'
import {
  DXFEED_PROP_FIRMS,
  getDxFeedPropFirm,
  getDxFeedPropFirmByAuthName,
  type DxFeedPropFirmDefinition,
} from '@/lib/dxfeed-propfirms'
import { normalizeDxFeedHistoricalHost } from '@/lib/dxfeed-historical-host'

export function parseDxFeedStoredCredentials(
  tokenField: string | null | undefined,
): DxFeedStoredCredentials | null {
  if (!tokenField) return null

  try {
    const parsed = JSON.parse(tokenField) as Partial<DxFeedStoredCredentials>
    if (
      typeof parsed.accessToken === 'string' &&
      parsed.accessToken &&
      typeof parsed.historicalHost === 'string' &&
      parsed.historicalHost
    ) {
      return parsed as DxFeedStoredCredentials
    }
    return null
  } catch {
    return null
  }
}

export function getDxFeedPropFirmByHistoricalHost(
  historicalHost?: string | null,
): DxFeedPropFirmDefinition | undefined {
  const normalized = normalizeDxFeedHistoricalHost(historicalHost)
  if (!normalized) return undefined

  try {
    const hostname = new URL(normalized).hostname.toLowerCase()
    return DXFEED_PROP_FIRMS.find(
      (firm) =>
        firm.enabled &&
        (hostname === firm.domain.toLowerCase() ||
          hostname.endsWith(`.${firm.domain.toLowerCase()}`)),
    )
  } catch {
    return undefined
  }
}

/** Resolve prop firm from stored credentials (id, auth name, or historical host). */
export function resolveDxFeedPropFirmFromStoredCredentials(
  credentials: DxFeedStoredCredentials,
): DxFeedPropFirmDefinition | undefined {
  return (
    getDxFeedPropFirm(credentials.propFirmId) ??
    getDxFeedPropFirmByAuthName(credentials.propfirmName) ??
    getDxFeedPropFirmByHistoricalHost(credentials.historicalHost)
  )
}

export function isDxFeedStoredCredentialsOutdated(
  credentials: DxFeedStoredCredentials,
): boolean {
  return !resolveDxFeedPropFirmFromStoredCredentials(credentials)
}

export function withResolvedDxFeedPropFirmId(
  credentials: DxFeedStoredCredentials,
  firm: DxFeedPropFirmDefinition,
): DxFeedStoredCredentials {
  if (credentials.propFirmId === firm.id) {
    return credentials
  }

  return {
    ...credentials,
    propFirmId: firm.id,
    propfirmName: credentials.propfirmName ?? firm.name,
  }
}
