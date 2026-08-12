"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  clearPendingPurchaseCookie,
  deserializePendingPurchase,
  PENDING_PURCHASE_COOKIE,
  readBrowserCookie,
} from "@/lib/attribution";
import {
  SIGNUP_SUCCESS_PARAM,
  SIGNUP_SUCCESS_VALUE,
} from "@/lib/signup-redirect";
import { isGoogleTagAllowed, readStoredConsentSettings } from "@/lib/consent-settings";

/**
 * Conversion `send_to` values from Google Ads (Tools → Conversions → Tag setup).
 * Format: `AW-XXXXXXXXXX/LABEL`. Leave unset until labels are pasted from Ads.
 */
const SIGNUP_SEND_TO =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_SEND_TO?.trim() || "";
const PURCHASE_SEND_TO =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_SEND_TO?.trim() || "";

const CONSENT_UPDATED_EVENT = "deltalytix:consent-updated";

/**
 * Id of the signup conversion already reported, if any.
 *
 * The signup marker survives more than one page view — it is deliberately
 * forwarded onto Stripe's cancel URL, and a reload replays it with a fresh
 * component instance — so an in-memory guard is not enough. Persisting the id
 * we sent lets Ads deduplicate on `transaction_id` and lets us skip re-firing.
 */
const SIGNUP_CONVERSION_ID_KEY = "deltalytix_signup_conversion_id";

function adsConsentGranted(): boolean {
  const settings = readStoredConsentSettings();
  if (!settings) return false;
  return isGoogleTagAllowed(settings) && settings.ad_storage === true;
}

function readStoredSignupConversionId(): string | null {
  try {
    return window.localStorage.getItem(SIGNUP_CONVERSION_ID_KEY);
  } catch {
    return null;
  }
}

function newConversionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `signup-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Returns false when nothing was sent, so callers can leave state to retry. */
function fireSignupConversion(): boolean {
  if (!SIGNUP_SEND_TO || !window.gtag) return false;
  if (readStoredSignupConversionId()) return false;

  const transactionId = newConversionId();
  window.gtag("event", "conversion", {
    send_to: SIGNUP_SEND_TO,
    transaction_id: transactionId,
  });

  try {
    window.localStorage.setItem(SIGNUP_CONVERSION_ID_KEY, transactionId);
  } catch {
    // private mode / quota — Ads still dedupes on the id we just sent
  }
  return true;
}

/** Returns false when nothing was sent, so the pending cookie is kept. */
function firePurchaseConversion({
  value,
  currency,
  transactionId,
}: {
  value: number;
  currency: string;
  transactionId: string;
}): boolean {
  if (!PURCHASE_SEND_TO || !window.gtag) return false;
  if (!(value > 0) || !transactionId) return false;
  window.gtag("event", "conversion", {
    send_to: PURCHASE_SEND_TO,
    value,
    currency: currency.toUpperCase(),
    transaction_id: transactionId,
  });
  return true;
}

/**
 * Fires Google Ads conversion tags when env labels are configured:
 * - Sign-up ↔ `?signup=success` (primary bidding event; URL marker still present)
 * - Subscribe ↔ `?success=true` after Stripe; value/currency/transaction_id
 *   from the pending-purchase cookie (Stripe Checkout session id)
 *
 * Instrumentation only — no product UX changes.
 */
export function GoogleAdsConversions() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const firedKey = useRef<string | null>(null);

  useEffect(() => {
    const run = () => {
      if (!adsConsentGranted()) return;

      const isSignup =
        searchParams.get(SIGNUP_SUCCESS_PARAM) === SIGNUP_SUCCESS_VALUE;
      const isPurchase = searchParams.get("success") === "true";

      if (!isSignup && !isPurchase) return;

      const key = `${pathname}?${searchParams.toString()}`;
      if (firedKey.current === key) return;

      // Claim the URL only once something was actually sent. A no-op run — gtag
      // still loading, label not configured yet — has to stay retryable, and
      // the only retry we get is the consent-update replay below.
      let fired = false;

      if (isSignup) {
        fired = fireSignupConversion() || fired;
      }

      if (isPurchase) {
        const pending = deserializePendingPurchase(
          readBrowserCookie(PENDING_PURCHASE_COOKIE),
        );
        // Only drop the cookie once the conversion is actually on the wire:
        // `firePurchaseConversion` no-ops while the Ads label is unconfigured
        // or gtag has not loaded, and clearing regardless would discard the
        // purchase value with no way to recover it.
        if (pending) {
          const purchaseFired = firePurchaseConversion({
            value: pending.revenue,
            currency: pending.currency,
            transactionId: pending.transaction_id,
          });
          if (purchaseFired) {
            for (const header of clearPendingPurchaseCookie()) {
              document.cookie = header;
            }
          }
          fired = purchaseFired || fired;
        }
      }

      if (fired) firedKey.current = key;
    };

    run();

    const onConsent = () => run();
    window.addEventListener(CONSENT_UPDATED_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_UPDATED_EVENT, onConsent);
  }, [pathname, searchParams]);

  return null;
}
