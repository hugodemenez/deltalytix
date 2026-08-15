import posthog from "posthog-js";

import {
  ANALYTICS_CONSENT_COOKIE,
  CONSENT_EVENT,
  CONSENT_RESET_EVENT,
  CONSENT_STORAGE_KEY,
  CONSENT_UPDATED_EVENT,
  DEFAULT_CONSENT_SETTINGS,
  type ConsentSettings,
  parseSharedAnalyticsConsent,
  readStoredConsentSettings,
} from "./consent-settings";
import { syncPostHogSessionRecording } from "./posthog-session-recording";

function isDeltalytixHost() {
  const host = window.location.hostname;
  return host === "deltalytix.app" || host.endsWith(".deltalytix.app");
}

function cookieAttributes() {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  return `Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
}

function writeAnalyticsConsentCookie(analyticsEnabled: boolean) {
  const value = analyticsEnabled ? "granted" : "denied";
  const attributes = cookieAttributes();

  // Keep the current-origin cookie in sync, then share the same choice with
  // production and beta. This avoids asking twice or silently opting beta out.
  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${value}; ${attributes}`;
  if (isDeltalytixHost()) {
    document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${value}; ${attributes}; Domain=.deltalytix.app`;
  }
}

function clearAnalyticsConsentCookie() {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
  if (isDeltalytixHost()) {
    document.cookie = `${ANALYTICS_CONSENT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}; Domain=.deltalytix.app`;
  }
}

export function syncPostHogConsent(analyticsEnabled: boolean) {
  writeAnalyticsConsentCookie(analyticsEnabled);

  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;

  if (analyticsEnabled) {
    const wasOptedOut = posthog.has_opted_out_capturing();
    if (!posthog.has_opted_in_capturing()) {
      posthog.opt_in_capturing();
    }
    syncPostHogSessionRecording(posthog, true);
    window.dispatchEvent(new Event(CONSENT_EVENT));

    if (wasOptedOut) {
      posthog.capture("$pageview", { $current_url: window.location.href });
    }
    return;
  }

  // Product use off must stop replay immediately, then opt out of capture.
  syncPostHogSessionRecording(posthog, false);
  if (!posthog.has_opted_out_capturing()) {
    posthog.opt_out_capturing();
  }
}

export function persistConsentSettings(settings: ConsentSettings) {
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(settings));
  syncPostHogConsent(settings.analytics_storage);
  // <GoogleTag /> owns everything Google-side: it loads the tag on first
  // consent and relays later changes, so this only has to announce.
  window.dispatchEvent(
    new CustomEvent(CONSENT_UPDATED_EVENT, {
      detail: settings,
    }),
  );
}

/**
 * Cookie is the cross-origin source of truth. Reconcile it with localStorage
 * and apply the already-saved choice to PostHog without showing the prompt.
 */
export function reconcileStoredConsent(): ConsentSettings | null {
  const sharedAnalyticsConsent = parseSharedAnalyticsConsent(document.cookie);
  const stored = readStoredConsentSettings();

  if (sharedAnalyticsConsent !== null) {
    const settings: ConsentSettings = {
      ...(stored ?? DEFAULT_CONSENT_SETTINGS),
      analytics_storage: sharedAnalyticsConsent,
    };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(settings));
    syncPostHogConsent(sharedAnalyticsConsent);
    return settings;
  }

  if (stored) {
    syncPostHogConsent(stored.analytics_storage);
    return stored;
  }

  return null;
}

export function resetConsentDecision() {
  localStorage.removeItem(CONSENT_STORAGE_KEY);
  clearAnalyticsConsentCookie();
  syncPostHogSessionRecording(posthog, false);
  if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) {
    if (!posthog.has_opted_out_capturing()) {
      posthog.opt_out_capturing();
    }
  }
  window.dispatchEvent(new Event(CONSENT_RESET_EVENT));
}
