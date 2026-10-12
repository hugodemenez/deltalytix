"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { ensureGoogleTag } from "@/components/google-tag";
import {
  clearPendingPurchaseCookie,
  deserializePendingPurchase,
  PENDING_PURCHASE_COOKIE,
  readBrowserCookie,
} from "@/lib/attribution";
import {
  type GoogleConsentState,
  resolveClientGoogleConsent,
} from "@/lib/consent-settings";
import {
  ADS_CONVERSION_EVENT,
  GA4_PURCHASE_EVENT,
  GA4_SIGNUP_EVENT,
  GOOGLE_ANALYTICS_ID,
  PURCHASE_SEND_TO,
  routePublishesAdsUserData,
  SIGNUP_SEND_TO,
  waitForAdsHashedEmail,
} from "@/lib/google-ads";
import {
  SIGNUP_SUCCESS_PARAM,
  SIGNUP_SUCCESS_VALUE,
} from "@/lib/signup-redirect";

/**
 * Id of the signup conversion already reported, if any.
 *
 * The signup marker survives more than one page view — it is deliberately
 * forwarded onto Stripe's cancel URL, and a reload replays it with a fresh
 * component instance — so an in-memory guard is not enough. Persisting the id
 * we sent lets Ads deduplicate on `transaction_id` and lets us skip re-firing.
 */
const SIGNUP_CONVERSION_ID_KEY = "deltalytix_signup_conversion_id";
const PURCHASE_CONVERSION_ID_KEY = "deltalytix_purchase_conversion_id";

/**
 * How long a dashboard conversion waits for the layout to publish the email
 * hash. Kept short: the conversion is not on the wire until it resolves.
 */
const USER_DATA_WAIT_MS = 1500;

/** Conversions already running in this tab; effects re-run on navigation. */
const inFlight = new Set<string>();

/**
 * Dedupe flags are ads measurement state: they only outlive the tab when
 * ad_storage is granted. Otherwise they stay in sessionStorage, and Google
 * still dedupes on the `transaction_id`.
 */
function dedupeStorage(consent: GoogleConsentState): Storage | null {
  try {
    return consent.ad_storage === "granted"
      ? window.localStorage
      : window.sessionStorage;
  } catch {
    return null;
  }
}

function readFlag(key: string): string | null {
  try {
    return (
      window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key)
    );
  } catch {
    return null;
  }
}

function writeFlag(consent: GoogleConsentState, key: string, value: string) {
  try {
    dedupeStorage(consent)?.setItem(key, value);
  } catch {
    // private mode / quota — Ads still dedupes on the id we just sent
  }
}

function newConversionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `signup-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Enhanced conversions: hashed email, only with ad_user_data granted. */
async function attachUserData(consent: GoogleConsentState) {
  if (consent.ad_user_data !== "granted") return;
  const waitMs = routePublishesAdsUserData(window.location.pathname)
    ? USER_DATA_WAIT_MS
    : 0;
  const hash = await waitForAdsHashedEmail(waitMs);
  if (hash) window.gtag?.("set", "user_data", { sha256_email_address: hash });
}

async function fireSignupConversion() {
  if (readFlag(SIGNUP_CONVERSION_ID_KEY)) return;

  const consent = resolveClientGoogleConsent();
  await attachUserData(consent);

  const transactionId = newConversionId();
  if (SIGNUP_SEND_TO) {
    window.gtag?.("event", ADS_CONVERSION_EVENT, {
      send_to: SIGNUP_SEND_TO,
      transaction_id: transactionId,
    });
  }
  window.gtag?.("event", GA4_SIGNUP_EVENT, { send_to: GOOGLE_ANALYTICS_ID });

  writeFlag(consent, SIGNUP_CONVERSION_ID_KEY, transactionId);
}

async function firePurchaseConversion() {
  const pending = deserializePendingPurchase(
    readBrowserCookie(PENDING_PURCHASE_COOKIE),
  );
  if (!pending) return;

  const clearCookie = () => {
    for (const header of clearPendingPurchaseCookie()) {
      document.cookie = header;
    }
  };

  if (readFlag(PURCHASE_CONVERSION_ID_KEY) === pending.transaction_id) {
    clearCookie();
    return;
  }

  const consent = resolveClientGoogleConsent();
  await attachUserData(consent);

  const params = {
    value: pending.revenue,
    currency: pending.currency.toUpperCase(),
    transaction_id: pending.transaction_id,
  };
  if (PURCHASE_SEND_TO) {
    window.gtag?.("event", ADS_CONVERSION_EVENT, {
      send_to: PURCHASE_SEND_TO,
      ...params,
    });
  }
  window.gtag?.("event", GA4_PURCHASE_EVENT, {
    send_to: GOOGLE_ANALYTICS_ID,
    ...params,
  });

  writeFlag(consent, PURCHASE_CONVERSION_ID_KEY, pending.transaction_id);
  clearCookie();
}

async function runOnce(key: string, fire: () => Promise<void>) {
  if (inFlight.has(key)) return;
  inFlight.add(key);
  try {
    await fire();
  } finally {
    inFlight.delete(key);
  }
}

/**
 * Reports Google Ads conversions on production hosts:
 * - Sign-up ↔ `?signup=success`, which the auth flows only add when
 *   `ensureUserInDatabase` created the User row (the `user_signed_up` signal).
 *   Fired once per browser via a stored flag.
 * - Purchase ↔ `?success=true` after Stripe Checkout; value, currency and the
 *   Checkout session id come from the pending-purchase cookie, which is
 *   cleared once reported.
 *
 * Fires regardless of consent: Consent Mode turns a denied state into a
 * cookieless ping instead of dropping the conversion.
 */
export function GoogleAdsConversions() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const isSignup =
      searchParams.get(SIGNUP_SUCCESS_PARAM) === SIGNUP_SUCCESS_VALUE;
    const isPurchase = searchParams.get("success") === "true";
    if (!isSignup && !isPurchase) return;
    if (!ensureGoogleTag()) return;

    if (isSignup) void runOnce("signup", fireSignupConversion);
    if (isPurchase) void runOnce("purchase", firePurchaseConversion);
  }, [pathname, searchParams]);

  return null;
}
