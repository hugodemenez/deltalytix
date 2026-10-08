/**
 * Google Ads tag configuration and conversion helpers.
 *
 * Conversion actions are created in Google Ads (Goals → Conversions → Tag
 * setup → "Use Google tag" → event snippet). The snippet's `send_to` is
 * `AW-<account tag id>/<label>`; configure the two parts separately:
 *
 * - `NEXT_PUBLIC_GOOGLE_ADS_ID`        e.g. `AW-16864609071`
 * - `NEXT_PUBLIC_GADS_SIGNUP_LABEL`    label of the sign-up conversion action
 * - `NEXT_PUBLIC_GADS_PURCHASE_LABEL`  label of the purchase conversion action
 *
 * The older full-`send_to` variables (`NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_SEND_TO`,
 * `NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_SEND_TO`) are still honoured when no label
 * is set, so existing deployments keep reporting.
 *
 * `process.env.NEXT_PUBLIC_*` must be read with literal names for Next.js to
 * inline them into the client bundle.
 */

export const DEFAULT_GOOGLE_ADS_ID = "AW-16864609071";
export const DEFAULT_GOOGLE_ANALYTICS_ID = "G-PYK62LTZRQ";

export const GOOGLE_ADS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() || DEFAULT_GOOGLE_ADS_ID;
export const GOOGLE_ANALYTICS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim() ||
  DEFAULT_GOOGLE_ANALYTICS_ID;

/** Ads conversion event name — the label in `send_to` picks the action. */
export const ADS_CONVERSION_EVENT = "conversion";
/** GA4 recommended events, sent to the GA4 property only. */
export const GA4_SIGNUP_EVENT = "sign_up";
export const GA4_PURCHASE_EVENT = "purchase";

export function resolveConversionSendTo({
  adsId,
  label,
  legacySendTo,
}: {
  adsId: string;
  label?: string | null;
  legacySendTo?: string | null;
}): string {
  const trimmedLabel = label?.trim();
  if (trimmedLabel) {
    // Tolerate a pasted full `AW-…/label` in the label variable.
    return trimmedLabel.includes("/") ? trimmedLabel : `${adsId}/${trimmedLabel}`;
  }
  return legacySendTo?.trim() || "";
}

export const SIGNUP_SEND_TO = resolveConversionSendTo({
  adsId: GOOGLE_ADS_ID,
  label: process.env.NEXT_PUBLIC_GADS_SIGNUP_LABEL,
  legacySendTo: process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_SEND_TO,
});

export const PURCHASE_SEND_TO = resolveConversionSendTo({
  adsId: GOOGLE_ADS_ID,
  label: process.env.NEXT_PUBLIC_GADS_PURCHASE_LABEL,
  legacySendTo: process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_SEND_TO,
});

/**
 * Google's enhanced-conversions normalisation: trim and lowercase, and for
 * gmail.com / googlemail.com drop dots and any `+tag` from the local part.
 */
export function normalizeEmailForAds(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;

  let local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.split("+")[0].replace(/\./g, "");
    if (!local) return null;
  }
  return `${local}@${domain}`;
}

/**
 * Hashed email of the signed-in user, published by the dashboard layout so
 * conversions can attach enhanced-conversion `user_data` without the raw
 * address ever reaching client code.
 */
let hashedEmail: string | null = null;
const hashedEmailWaiters = new Set<(hash: string) => void>();

export function setAdsHashedEmail(hash: string | null) {
  hashedEmail = hash;
  if (!hash) return;
  for (const resolve of hashedEmailWaiters) resolve(hash);
  hashedEmailWaiters.clear();
}

/** Resolves with the hash, or null when none arrives within `timeoutMs`. */
export function waitForAdsHashedEmail(timeoutMs: number): Promise<string | null> {
  if (hashedEmail) return Promise.resolve(hashedEmail);
  return new Promise((resolve) => {
    const onHash = (hash: string) => {
      clearTimeout(timer);
      resolve(hash);
    };
    const timer = setTimeout(() => {
      hashedEmailWaiters.delete(onHash);
      resolve(null);
    }, timeoutMs);
    hashedEmailWaiters.add(onHash);
  });
}
