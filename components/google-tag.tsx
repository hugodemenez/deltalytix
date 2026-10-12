"use client";

import { useEffect } from "react";

import {
  CONSENT_RESET_EVENT,
  CONSENT_UPDATED_EVENT,
  resolveClientGoogleConsent,
} from "@/lib/consent-settings";
import { GOOGLE_ADS_ID, GOOGLE_ANALYTICS_ID } from "@/lib/google-ads";

function isProductionHost() {
  return (
    window.location.hostname === "deltalytix.app" ||
    window.location.hostname === "www.deltalytix.app"
  );
}

/**
 * Loads the Google tag on production hosts, always.
 *
 * Consent Mode v2 decides what the tag may store, not whether it loads: the
 * `consent default` is queued before gtag.js is requested, so with consent
 * denied Google only receives cookieless pings (used for conversion
 * modelling). Idempotent — conversions call it too, so their events can never
 * be queued ahead of the consent default and `config` commands.
 */
export function ensureGoogleTag(): boolean {
  if (typeof window === "undefined" || !isProductionHost()) return false;

  if (
    document.querySelector(`script[data-google-tag="${GOOGLE_ADS_ID}"]`) &&
    window.gtag
  ) {
    return true;
  }

  const dataLayer = (window.dataLayer = window.dataLayer || []);
  window.gtag = function gtag() {
    // Google Tag's command queue expects the function's arguments object.
    // eslint-disable-next-line prefer-rest-params
    dataLayer.push(arguments);
  };

  window.gtag("consent", "default", {
    ...resolveClientGoogleConsent(),
    // Gives a first-visit banner choice a moment to land before tags fire.
    wait_for_update: 500,
  });
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ANALYTICS_ID);
  window.gtag("config", GOOGLE_ADS_ID, { allow_enhanced_conversions: true });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  script.dataset.googleTag = GOOGLE_ADS_ID;
  document.head.appendChild(script);
  return true;
}

export function GoogleTag() {
  useEffect(() => {
    ensureGoogleTag();

    const handleConsentChange = () => {
      if (!ensureGoogleTag()) return;
      window.gtag?.("consent", "update", resolveClientGoogleConsent());
    };

    window.addEventListener(CONSENT_UPDATED_EVENT, handleConsentChange);
    window.addEventListener(CONSENT_RESET_EVENT, handleConsentChange);
    return () => {
      window.removeEventListener(CONSENT_UPDATED_EVENT, handleConsentChange);
      window.removeEventListener(CONSENT_RESET_EVENT, handleConsentChange);
    };
  }, []);

  return null;
}
