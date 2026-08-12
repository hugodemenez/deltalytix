"use client";

import { useEffect } from "react";

import {
  type ConsentSettings,
  isGoogleTagAllowed,
  readStoredConsentSettings,
  toGoogleConsent,
} from "@/lib/consent-settings";

const GOOGLE_ANALYTICS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim() || "G-PYK62LTZRQ";
/** Google Ads account tag. Override with NEXT_PUBLIC_GOOGLE_ADS_ID if needed. */
const GOOGLE_ADS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() || "AW-16864609071";
const CONSENT_UPDATED_EVENT = "deltalytix:consent-updated";

function isProductionHost() {
  return (
    window.location.hostname === "deltalytix.app" ||
    window.location.hostname === "www.deltalytix.app"
  );
}

function configureGoogleTag(settings: ConsentSettings) {
  if (!isProductionHost()) return;

  // Without consent the tag is never injected, so there is nothing to load and
  // at most an already-loaded tag to notify of the withdrawal.
  if (!isGoogleTagAllowed(settings)) {
    window.gtag?.("consent", "update", toGoogleConsent(settings));
    return;
  }

  const existingScript = document.querySelector(
    `script[data-google-tag="${GOOGLE_ADS_ID}"]`,
  );

  const dataLayer = (window.dataLayer = window.dataLayer || []);
  window.gtag =
    window.gtag ||
    function gtag() {
      // Google Tag's command queue expects the function's arguments object.
      // eslint-disable-next-line prefer-rest-params
      dataLayer.push(arguments);
    };

  if (existingScript) {
    window.gtag("consent", "update", toGoogleConsent(settings));
    return;
  }

  window.gtag("consent", "default", toGoogleConsent(settings));
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ANALYTICS_ID);
  window.gtag("config", GOOGLE_ADS_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  script.dataset.googleTag = GOOGLE_ADS_ID;
  document.head.appendChild(script);
}

export function GoogleTag() {
  useEffect(() => {
    const initialSettings = readStoredConsentSettings();
    if (initialSettings) configureGoogleTag(initialSettings);

    const handleConsentUpdate = (event: Event) => {
      const settings = (event as CustomEvent<ConsentSettings>).detail;
      if (settings) configureGoogleTag(settings);
    };

    window.addEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdate);
    return () =>
      window.removeEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdate);
  }, []);

  return null;
}
