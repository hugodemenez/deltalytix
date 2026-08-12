"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  clearPendingPurchaseCookie,
  deserializePendingPurchase,
  PENDING_PURCHASE_COOKIE,
} from "@/lib/attribution";
import {
  SIGNUP_SUCCESS_PARAM,
  SIGNUP_SUCCESS_VALUE,
} from "@/lib/signup-redirect";
import { isGoogleTagAllowed, type ConsentSettings } from "@/lib/consent-settings";

/**
 * Conversion `send_to` values from Google Ads (Tools → Conversions → Tag setup).
 * Format: `AW-XXXXXXXXXX/LABEL`. Leave unset until labels are pasted from Ads.
 */
const SIGNUP_SEND_TO =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_SEND_TO?.trim() || "";
const PURCHASE_SEND_TO =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_SEND_TO?.trim() || "";

const CONSENT_UPDATED_EVENT = "deltalytix:consent-updated";

function readConsentSettings(): ConsentSettings | null {
  const storedConsent = window.localStorage.getItem("cookieConsent");
  if (!storedConsent) return null;
  try {
    return JSON.parse(storedConsent) as ConsentSettings;
  } catch {
    return null;
  }
}

function adsConsentGranted(): boolean {
  const settings = readConsentSettings();
  if (!settings) return false;
  return isGoogleTagAllowed(settings) && settings.ad_storage === true;
}

function readCookie(name: string): string | null {
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

function fireSignupConversion() {
  if (!SIGNUP_SEND_TO || !window.gtag) return;
  window.gtag("event", "conversion", {
    send_to: SIGNUP_SEND_TO,
  });
}

function firePurchaseConversion({
  value,
  currency,
  transactionId,
}: {
  value: number;
  currency: string;
  transactionId: string;
}) {
  if (!PURCHASE_SEND_TO || !window.gtag) return;
  if (!(value > 0) || !transactionId) return;
  window.gtag("event", "conversion", {
    send_to: PURCHASE_SEND_TO,
    value,
    currency: currency.toUpperCase(),
    transaction_id: transactionId,
  });
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
      firedKey.current = key;

      if (isSignup) {
        fireSignupConversion();
      }

      if (isPurchase) {
        const pending = deserializePendingPurchase(
          readCookie(PENDING_PURCHASE_COOKIE),
        );
        if (pending) {
          firePurchaseConversion({
            value: pending.revenue,
            currency: pending.currency,
            transactionId: pending.transaction_id,
          });
          document.cookie = clearPendingPurchaseCookie();
        }
      }
    };

    run();

    const onConsent = () => run();
    window.addEventListener(CONSENT_UPDATED_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_UPDATED_EVENT, onConsent);
  }, [pathname, searchParams]);

  return null;
}
