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
