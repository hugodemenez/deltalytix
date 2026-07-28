"use client";

import { useEffect } from "react";

const GOOGLE_ANALYTICS_ID = "G-PYK62LTZRQ";
const GOOGLE_ADS_ID = "AW-16864609071";
const CONSENT_UPDATED_EVENT = "deltalytix:consent-updated";

interface ConsentSettings {
  analytics_storage: boolean;
  ad_storage: boolean;
  ad_user_data: boolean;
  ad_personalization: boolean;
  functionality_storage: boolean;
  personalization_storage: boolean;
  security_storage: boolean;
}

function isProductionHost() {
  return (
    window.location.hostname === "deltalytix.app" ||
    window.location.hostname === "www.deltalytix.app"
  );
}

function readConsentSettings(): ConsentSettings | null {
  const storedConsent = window.localStorage.getItem("cookieConsent");
  if (!storedConsent) return null;

  try {
    return JSON.parse(storedConsent) as ConsentSettings;
  } catch {
    return null;
  }
}

function toGoogleConsent(settings: ConsentSettings) {
  return {
    analytics_storage: settings.analytics_storage ? "granted" : "denied",
    ad_storage: settings.ad_storage ? "granted" : "denied",
    ad_user_data: settings.ad_user_data ? "granted" : "denied",
    ad_personalization: settings.ad_personalization ? "granted" : "denied",
    functionality_storage: settings.functionality_storage
      ? "granted"
      : "denied",
    personalization_storage: settings.personalization_storage
      ? "granted"
      : "denied",
    security_storage: settings.security_storage ? "granted" : "denied",
  } as const;
}

function configureGoogleTag(settings: ConsentSettings) {
  if (!isProductionHost()) return;

  const measurementAllowed = settings.analytics_storage;

  if (!measurementAllowed) {
    window.gtag?.("consent", "update", toGoogleConsent(settings));
    return;
  }

  const existingScript = document.querySelector(
    `script[data-google-tag="${GOOGLE_ADS_ID}"]`,
  );

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    // Google Tag's command queue expects the function's arguments object.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };

  if (!existingScript) {
    window.gtag("consent", "default", toGoogleConsent(settings));
    window.gtag("js", new Date());
    window.gtag("config", GOOGLE_ANALYTICS_ID);
    window.gtag("config", GOOGLE_ADS_ID);

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
    script.dataset.googleTag = GOOGLE_ADS_ID;
    document.head.appendChild(script);
  } else {
    window.gtag("consent", "update", toGoogleConsent(settings));
  }
}

export function GoogleTag() {
  useEffect(() => {
    const initialSettings = readConsentSettings();
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
