/**
 * Regional analytics consent.
 *
 * EEA, UK and Switzerland see a banner and stay cookieless until they accept.
 * Unknown country uses that same EU behaviour. Everywhere else (US, etc.)
 * captures by default and is offered a persistent opt-out.
 */

/** Shared Domain cookie written by `proxy.ts` from Vercel geo headers. */
export const USER_COUNTRY_COOKIE = "user-country";

/**
 * ISO 3166-1 alpha-2 codes that require an analytics consent banner.
 * EEA members, UK (`GB`), Switzerland, and EU outermost regions that
 * Vercel sometimes reports separately from the parent state.
 */
export const CONSENT_REQUIRED_COUNTRIES = new Set([
  // EU
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  // EEA (non-EU)
  "IS",
  "LI",
  "NO",
  // UK + Switzerland
  "GB",
  "UK",
  "CH",
  // French outermost / overseas (GDPR territory)
  "GP",
  "MQ",
  "GF",
  "RE",
  "YT",
  "PM",
  "BL",
  "MF",
  "NC",
  "PF",
  "WF",
  "TF",
  "AX",
]);

export function normalizeCountryCode(
  country: string | null | undefined,
): string | null {
  if (!country) return null;
  const normalized = country.trim().toUpperCase();
  return normalized.length === 2 ? normalized : null;
}

/**
 * True when the visitor must see the consent banner and stay cookieless
 * until they accept. Unknown country is treated as EU.
 */
export function requiresCookieConsent(
  country: string | null | undefined,
): boolean {
  const normalized = normalizeCountryCode(country);
  if (!normalized) return true;
  return CONSENT_REQUIRED_COUNTRIES.has(normalized);
}

/** Request / response headers the app already uses for geo. */
export function readCountryFromHeaders(
  headers: Headers | { get(name: string): string | null },
): string | null {
  return normalizeCountryCode(
    headers.get("x-user-country") ?? headers.get("x-vercel-ip-country"),
  );
}

export function readCountryFromCookieHeader(
  cookieHeader: string,
): string | null {
  try {
    const cookie = cookieHeader
      .split("; ")
      .find((entry) => entry.startsWith(`${USER_COUNTRY_COOKIE}=`));
    if (!cookie) return null;
    return normalizeCountryCode(decodeURIComponent(cookie.split("=")[1] ?? ""));
  } catch {
    return null;
  }
}

/** Browser-only — `user-country` is set by the proxy on every HTML response. */
export function readClientCountry(): string | null {
  if (typeof document === "undefined") return null;
  return readCountryFromCookieHeader(document.cookie);
}
