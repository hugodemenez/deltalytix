/**
 * First-party paid attribution (UTM + Google click IDs).
 *
 * Captured on the landing URL and persisted for 90 days so Google OAuth and
 * Stripe Checkout hops do not drop campaign context before PostHog events fire.
 * First-touch wins: once stored, later landings do not overwrite.
 */

export const ATTRIBUTION_COOKIE = "deltalytix_attribution";
export const ATTRIBUTION_STORAGE_KEY = "deltalytix_attribution";
export const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

export const PENDING_PURCHASE_COOKIE = "deltalytix_pending_purchase";
export const PENDING_PURCHASE_MAX_AGE_SECONDS = 60 * 60 * 6; // 6 hours

export const ATTRIBUTION_PARAM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "gbraid",
  "wbraid",
] as const;

export type AttributionParamKey = (typeof ATTRIBUTION_PARAM_KEYS)[number];

export type Attribution = Partial<Record<AttributionParamKey, string>>;

export type PendingPurchase = {
  revenue: number;
  currency: string;
  /** Stripe Checkout session id — passed to Ads gtag as `transaction_id`. */
  transaction_id: string;
  plan?: string;
  billing_interval?: string;
};

const UTM_TO_POSTHOG: Record<string, string> = {
  utm_source: "$utm_source",
  utm_medium: "$utm_medium",
  utm_campaign: "$utm_campaign",
  utm_content: "$utm_content",
  utm_term: "$utm_term",
};

function sanitizeValue(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) return undefined;
  return trimmed;
}

/** Pull attribution params from a URLSearchParams / query object. */
export function parseAttributionParams(
  params: URLSearchParams | Record<string, string | string[] | undefined | null>,
): Attribution {
  const attribution: Attribution = {};

  for (const key of ATTRIBUTION_PARAM_KEYS) {
    let raw: string | null | undefined;
    if (params instanceof URLSearchParams) {
      raw = params.get(key);
    } else {
      const value = params[key];
      raw = Array.isArray(value) ? value[0] : value;
    }
    const sanitized = sanitizeValue(raw);
    if (sanitized) attribution[key] = sanitized;
  }

  return attribution;
}

export function hasAttribution(attribution: Attribution | null | undefined): boolean {
  if (!attribution) return false;
  return ATTRIBUTION_PARAM_KEYS.some((key) => Boolean(attribution[key]));
}

/** First-touch merge: keep existing keys, fill only missing ones from incoming. */
export function mergeAttributionFirstTouch(
  existing: Attribution | null | undefined,
  incoming: Attribution | null | undefined,
): Attribution {
  const merged: Attribution = { ...(existing ?? {}) };
  if (!incoming) return merged;

  for (const key of ATTRIBUTION_PARAM_KEYS) {
    if (!merged[key] && incoming[key]) {
      merged[key] = incoming[key];
    }
  }
  return merged;
}

export function serializeAttribution(attribution: Attribution): string {
  return JSON.stringify(attribution);
}

export function deserializeAttribution(raw: string | null | undefined): Attribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    const attribution: Attribution = {};
    for (const key of ATTRIBUTION_PARAM_KEYS) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === "string") {
        const sanitized = sanitizeValue(value);
        if (sanitized) attribution[key] = sanitized;
      }
    }
    return hasAttribution(attribution) ? attribution : null;
  } catch {
    return null;
  }
}

/**
 * Event + person properties for PostHog.
 * Uses `$utm_*` plus custom click-id keys; `$set_once` keeps first-touch on the person.
 */
export function attributionToPostHogProperties(
  attribution: Attribution | null | undefined,
): Record<string, string> {
  if (!hasAttribution(attribution)) return {};

  const properties: Record<string, string> = {};
  for (const key of ATTRIBUTION_PARAM_KEYS) {
    const value = attribution?.[key];
    if (!value) continue;
    if (key.startsWith("utm_")) {
      const posthogKey = UTM_TO_POSTHOG[key];
      if (posthogKey) properties[posthogKey] = value;
      properties[key] = value;
    } else {
      properties[key] = value;
    }
  }
  return properties;
}

export function attributionToPersonSetOnce(
  attribution: Attribution | null | undefined,
): Record<string, string> | undefined {
  const props = attributionToPostHogProperties(attribution);
  return Object.keys(props).length > 0 ? props : undefined;
}

/** Flatten attribution into Stripe Checkout Session metadata (string values only). */
export function attributionToStripeMetadata(
  attribution: Attribution | null | undefined,
): Record<string, string> {
  if (!hasAttribution(attribution)) return {};

  const metadata: Record<string, string> = {};
  for (const key of ATTRIBUTION_PARAM_KEYS) {
    const value = attribution?.[key];
    if (value) metadata[key] = value;
  }
  return metadata;
}

export function attributionFromStripeMetadata(
  metadata: StripeLikeMetadata | null | undefined,
): Attribution {
  if (!metadata) return {};
  return parseAttributionParams(metadata as Record<string, string | undefined>);
}

type StripeLikeMetadata = Record<string, string | undefined> | null | undefined;

export function serializePendingPurchase(purchase: PendingPurchase): string {
  return JSON.stringify(purchase);
}

export function deserializePendingPurchase(
  raw: string | null | undefined,
): PendingPurchase | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingPurchase;
    const transactionId =
      typeof parsed?.transaction_id === "string"
        ? parsed.transaction_id.trim()
        : "";
    if (
      typeof parsed?.revenue !== "number" ||
      !Number.isFinite(parsed.revenue) ||
      parsed.revenue <= 0 ||
      typeof parsed.currency !== "string" ||
      !parsed.currency ||
      !transactionId
    ) {
      return null;
    }
    return {
      revenue: parsed.revenue,
      currency: parsed.currency.toLowerCase(),
      transaction_id: transactionId,
      ...(typeof parsed.plan === "string" ? { plan: parsed.plan } : {}),
      ...(typeof parsed.billing_interval === "string"
        ? { billing_interval: parsed.billing_interval }
        : {}),
    };
  } catch {
    return null;
  }
}

/** Stripe amounts are minor units; PostHog/Ads expect major units. */
export function minorUnitsToMajor(amount: number | null | undefined): number | null {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
    return null;
  }
  return amount / 100;
}

/**
 * Resolve purchase revenue for analytics.
 * Prefer session `amount_total`; fall back to line-item totals / price unit_amount
 * so we never coerce a real Stripe amount into 0 via a nullish ternary.
 */
export function resolveCheckoutRevenueMajor({
  amountTotal,
  lineItemAmountTotal,
  priceUnitAmount,
}: {
  amountTotal?: number | null;
  lineItemAmountTotal?: number | null;
  priceUnitAmount?: number | null;
}): number | null {
  for (const candidate of [amountTotal, lineItemAmountTotal, priceUnitAmount]) {
    const major = minorUnitsToMajor(candidate);
    if (major !== null && major > 0) return major;
  }

  // Explicit zero only when Stripe reported a zero total (trial / 100% off).
  if (amountTotal === 0) return 0;
  return null;
}

export function clearPendingPurchaseCookie(): string {
  return `${PENDING_PURCHASE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function readBrowserCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!entry) return null;
  const value = entry.slice(name.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Client-only: cookie first, then localStorage (OAuth-safe first-touch store). */
export function readClientAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;

  const fromCookie = deserializeAttribution(readBrowserCookie(ATTRIBUTION_COOKIE));
  if (fromCookie) return fromCookie;

  try {
    return deserializeAttribution(window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY));
  } catch {
    return null;
  }
}
