/**
 * Shared consent vocabulary for the cookie banner and the Google tag.
 *
 * Both sides have to agree on the exact key set: the banner persists it to
 * localStorage, the tag replays it to Google. Keeping one definition here stops
 * the two from drifting apart when a category is added.
 */

export interface ConsentSettings {
  analytics_storage: boolean;
  ad_storage: boolean;
  ad_user_data: boolean;
  ad_personalization: boolean;
  functionality_storage: boolean;
  personalization_storage: boolean;
  security_storage: boolean;
}

/** Where the banner persists its decision; read by every consent-gated script. */
export const CONSENT_STORAGE_KEY = "cookieConsent";

/** Shared Domain cookie so beta/prod keep the same analytics (and replay) choice. */
export const ANALYTICS_CONSENT_COOKIE = "deltalytix_analytics_consent";

/** PostHog opted in after analytics (Product use) was granted. */
export const CONSENT_EVENT = "deltalytix:analytics-consent";

/** Google tag and attribution listen for a saved decision. */
export const CONSENT_UPDATED_EVENT = "deltalytix:consent-updated";

/** Dev reset (and Settings) so the first-visit prompt can return. */
export const CONSENT_RESET_EVENT = "deltalytix:consent-reset";

/** The two first-visit switches. Necessary cookies are never a choice. */
export interface ConsentRecordChoices {
  productUse: boolean;
  ads: boolean;
}

/**
 * Necessary cookies stay on and are not listed. Optional switches default off.
 * Ads is click measurement only — no ad profile (user data / personalization).
 */
export const DEFAULT_CONSENT_SETTINGS: ConsentSettings = {
  analytics_storage: false,
  ad_storage: false,
  ad_user_data: false,
  ad_personalization: false,
  functionality_storage: true,
  personalization_storage: false,
  security_storage: true,
};

export function fromRecordChoices(
  choices: ConsentRecordChoices,
): ConsentSettings {
  return {
    ...DEFAULT_CONSENT_SETTINGS,
    analytics_storage: choices.productUse,
    ad_storage: choices.ads,
  };
}

export function toRecordChoices(
  settings: Partial<ConsentSettings> | null,
  sharedAnalytics: boolean | null = null,
): ConsentRecordChoices {
  return {
    productUse:
      sharedAnalytics !== null
        ? sharedAnalytics
        : settings?.analytics_storage === true,
    ads: settings?.ad_storage === true,
  };
}

/**
 * A first-visit prompt should hide once either store has a decision —
 * including both-off saved via Continue.
 */
export function hasConsentDecisionFromStores({
  cookieHeader,
  storedConsent,
}: {
  cookieHeader: string;
  storedConsent: Partial<ConsentSettings> | null;
}): boolean {
  if (parseSharedAnalyticsConsent(cookieHeader) !== null) return true;
  return storedConsent !== null;
}

/** Browser-only — used by the first-visit prompt. */
export function hasClientConsentDecision(): boolean {
  if (typeof document === "undefined") return false;
  return hasConsentDecisionFromStores({
    cookieHeader: document.cookie,
    storedConsent: readStoredConsentSettings(),
  });
}

/**
 * Reads the cross-origin analytics cookie. `granted` / `denied` are the only
 * stored values; anything else is treated as "no decision yet".
 */
export function parseSharedAnalyticsConsent(
  cookieHeader: string,
): boolean | null {
  try {
    const cookie = cookieHeader
      .split("; ")
      .find((entry) => entry.startsWith(`${ANALYTICS_CONSENT_COOKIE}=`));

    if (!cookie) return null;

    const value = cookie.split("=")[1];
    if (value === "granted") return true;
    if (value === "denied") return false;
    return null;
  } catch {
    return null;
  }
}

/**
 * Cookie is the cross-origin source of truth. localStorage is the fallback for
 * an origin-local decision that has not been migrated onto the shared cookie.
 */
export function hasAnalyticsConsentFromStores({
  cookieHeader,
  storedConsent,
}: {
  cookieHeader: string;
  storedConsent: Partial<ConsentSettings> | null;
}): boolean {
  const shared = parseSharedAnalyticsConsent(cookieHeader);
  if (shared !== null) return shared;
  return storedConsent?.analytics_storage === true;
}

/** Browser-only — used by PostHog init and the cookie banner. */
export function hasClientAnalyticsConsent(): boolean {
  if (typeof document === "undefined") return false;
  return hasAnalyticsConsentFromStores({
    cookieHeader: document.cookie,
    storedConsent: readStoredConsentSettings(),
  });
}

/**
 * The banner's stored decision, or null when it has not been answered yet.
 * Browser-only — callers are consent-gated client components.
 */
export function readStoredConsentSettings(): ConsentSettings | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as ConsentSettings;
  } catch {
    return null;
  }
}

export type GoogleConsentValue = "granted" | "denied";

export type GoogleConsentState = Record<
  keyof ConsentSettings,
  GoogleConsentValue
>;

const CONSENT_KEYS = [
  "analytics_storage",
  "ad_storage",
  "ad_user_data",
  "ad_personalization",
  "functionality_storage",
  "personalization_storage",
  "security_storage",
] as const satisfies readonly (keyof ConsentSettings)[];

/**
 * Translates the banner's booleans into Google's granted/denied vocabulary.
 * Missing keys — a payload written by an older banner version — degrade to
 * "denied" rather than being sent as undefined.
 */
export function toGoogleConsent(
  settings: Partial<ConsentSettings>,
): GoogleConsentState {
  return CONSENT_KEYS.reduce((state, key) => {
    state[key] = settings[key] ? "granted" : "denied";
    return state;
  }, {} as GoogleConsentState);
}

/**
 * Whether the Google tag may load at all.
 *
 * Analytics and Ads are served by the same tag, so consenting to either one is
 * enough to justify loading it — gating on analytics alone silently drops Ads
 * conversions for anyone who accepts ad storage but declines analytics.
 */
export function isGoogleTagAllowed(
  settings: Partial<ConsentSettings>,
): boolean {
  return Boolean(settings.analytics_storage || settings.ad_storage);
}
