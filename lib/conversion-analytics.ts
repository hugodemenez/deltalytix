/**
 * Server-side conversion events. These never depend on the browser consent
 * cookie or ad blockers — they are captured with posthog-node from checkout
 * and the Stripe webhook.
 *
 * `user_signed_up` lives in `signup-analytics.ts` and is reused as the
 * signup conversion. Do not add a second signup event.
 */

import { requiresCookieConsent } from "./consent-region";

export const CHECKOUT_STARTED_EVENT = "checkout_started";
export const SUBSCRIPTION_PURCHASED_EVENT = "subscription_purchased";

export const CONVERSION_EVENTS = [
  CHECKOUT_STARTED_EVENT,
  SUBSCRIPTION_PURCHASED_EVENT,
  "user_signed_up",
] as const;

export interface ConversionProperties {
  [key: string]:
    | boolean
    | number
    | string
    | null
    | undefined
    | ConversionProperties;
}

const EMAIL_KEYS = new Set(["email", "$email", "user_email"]);

function stripEmailFromRecord(
  record: ConversionProperties,
): ConversionProperties {
  const next: ConversionProperties = {};
  for (const [key, value] of Object.entries(record)) {
    if (EMAIL_KEYS.has(key.toLowerCase())) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      next[key] = stripEmailFromRecord(value);
      continue;
    }
    next[key] = value;
  }
  return next;
}

/**
 * EU / unknown visitors must not have email on conversion properties.
 * Non-EU can keep it unless they saved an analytics denial (US CCPA opt-out).
 */
export function sanitizeConversionProperties(
  properties: ConversionProperties,
  country: string | null | undefined,
  options?: { consentDenied?: boolean },
): ConversionProperties {
  if (requiresCookieConsent(country) || options?.consentDenied) {
    return stripEmailFromRecord(properties);
  }
  return properties;
}

export function isConversionEvent(event: string): boolean {
  return (CONVERSION_EVENTS as readonly string[]).includes(event);
}

export function checkoutStartedInsertId(checkoutSessionId: string): string {
  return `${CHECKOUT_STARTED_EVENT}:${checkoutSessionId}`;
}

export function subscriptionPurchasedInsertId(stripeEventId: string): string {
  return `${SUBSCRIPTION_PURCHASED_EVENT}:${stripeEventId}`;
}

export function buildCheckoutStartedCapture({
  distinctId,
  country,
  consentDenied = false,
  properties = {},
}: {
  distinctId: string;
  country?: string | null;
  consentDenied?: boolean;
  properties?: ConversionProperties;
}): {
  skipConsent: true;
  distinctId: string;
  event: typeof CHECKOUT_STARTED_EVENT;
  properties: ConversionProperties;
} {
  const checkoutSessionId =
    typeof properties.stripe_checkout_session_id === "string"
      ? properties.stripe_checkout_session_id
      : distinctId;

  return {
    skipConsent: true,
    distinctId,
    event: CHECKOUT_STARTED_EVENT,
    properties: sanitizeConversionProperties(
      {
        ...properties,
        $insert_id: checkoutStartedInsertId(checkoutSessionId),
      },
      country,
      { consentDenied },
    ),
  };
}

export function buildSubscriptionPurchasedCapture({
  distinctId,
  stripeEventId,
  country,
  consentDenied = false,
  properties = {},
}: {
  distinctId: string;
  stripeEventId: string;
  country?: string | null;
  consentDenied?: boolean;
  properties?: ConversionProperties;
}): {
  skipConsent: true;
  distinctId: string;
  event: typeof SUBSCRIPTION_PURCHASED_EVENT;
  properties: ConversionProperties;
} {
  return {
    skipConsent: true,
    distinctId,
    event: SUBSCRIPTION_PURCHASED_EVENT,
    properties: sanitizeConversionProperties(
      {
        ...properties,
        $insert_id: subscriptionPurchasedInsertId(stripeEventId),
      },
      country,
      { consentDenied },
    ),
  };
}
