import { normalizeDxFeedHistoricalHost } from "@/lib/dxfeed-historical-host";
import {
  DXFEED_PROP_FIRMS,
  getDxFeedPropFirm,
  getDxFeedPropFirmByAuthName,
  type DxFeedPropFirmDefinition,
} from "@/lib/dxfeed-propfirms";

export interface DxFeedStoredCredentials {
  accessToken: string;
  historicalHost: string;
  accountNumbers?: string[];
  /** User-selected prop firm id (see lib/dxfeed-propfirms.ts). */
  propFirmId?: string;
  /** Display name captured from the selected prop firm or a legacy auth response. */
  propfirmName?: string;
  /** Marks a stored expiration as provider-supplied rather than a legacy guessed TTL. */
  tokenExpirationSource?: "provider" | "jwt";
}

export function parseDxFeedStoredCredentials(
  tokenField: string | null | undefined,
): DxFeedStoredCredentials | null {
  if (!tokenField) return null;

  try {
    const parsed = JSON.parse(tokenField) as Partial<DxFeedStoredCredentials>;
    if (
      typeof parsed.accessToken === "string" &&
      parsed.accessToken.length > 0 &&
      typeof parsed.historicalHost === "string" &&
      parsed.historicalHost.length > 0
    ) {
      return parsed as DxFeedStoredCredentials;
    }
  } catch {
    // Invalid stored JSON requires reconnecting the account.
  }

  return null;
}

export function getDxFeedPropFirmByHistoricalHost(
  historicalHost?: string | null,
): DxFeedPropFirmDefinition | undefined {
  const normalized = normalizeDxFeedHistoricalHost(historicalHost);
  if (!normalized) return undefined;

  try {
    const hostname = new URL(normalized).hostname.toLowerCase();
    return DXFEED_PROP_FIRMS.find((firm) => {
      const domain = firm.domain.toLowerCase();
      return hostname === domain || hostname.endsWith(`.${domain}`);
    });
  } catch {
    return undefined;
  }
}

/** Resolve legacy credentials using the strongest available prop-firm signal. */
export function resolveDxFeedPropFirmFromStoredCredentials(
  credentials: DxFeedStoredCredentials,
): DxFeedPropFirmDefinition | undefined {
  return (
    getDxFeedPropFirm(credentials.propFirmId) ??
    getDxFeedPropFirmByAuthName(credentials.propfirmName) ??
    getDxFeedPropFirmByHistoricalHost(credentials.historicalHost)
  );
}

export function isDxFeedStoredCredentialsOutdated(
  credentials: DxFeedStoredCredentials,
): boolean {
  return !resolveDxFeedPropFirmFromStoredCredentials(credentials);
}

export function withResolvedDxFeedPropFirmId(
  credentials: DxFeedStoredCredentials,
  firm: DxFeedPropFirmDefinition,
): DxFeedStoredCredentials {
  if (credentials.propFirmId === firm.id) return credentials;

  return {
    ...credentials,
    propFirmId: firm.id,
    propfirmName: credentials.propfirmName ?? firm.name,
  };
}
