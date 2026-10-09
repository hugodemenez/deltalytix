"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE_SECONDS,
  ATTRIBUTION_STORAGE_KEY,
  type Attribution,
  attributionToPostHogProperties,
  isDeltalytixHost,
  mergeAttributionFirstTouch,
  parseAttributionParams,
  planAttributionStorage,
  readClientAttribution,
  serializeAttribution,
} from "@/lib/attribution";
import {
  CONSENT_UPDATED_EVENT,
  resolveClientGoogleConsent,
} from "@/lib/consent-settings";

/**
 * Campaign params seen on the landing URL, held in memory only.
 *
 * The banner is frequently accepted a page or two after the ad click, by which
 * point `location.search` no longer carries the params. Buffering them here
 * keeps them recoverable without writing anything before consent — the module
 * lives as long as the tab, and is gone with it.
 */
let bufferedAttribution: Attribution | null = null;

function writeAttributionCookie(attribution: Attribution) {
  const value = encodeURIComponent(serializeAttribution(attribution));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const attributes = `Max-Age=${ATTRIBUTION_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;

  document.cookie = `${ATTRIBUTION_COOKIE}=${value}; ${attributes}`;
  if (isDeltalytixHost(window.location.hostname)) {
    document.cookie = `${ATTRIBUTION_COOKIE}=${value}; ${attributes}; Domain=.deltalytix.app`;
  }
}

function persistAttribution(attribution: Attribution) {
  writeAttributionCookie(attribution);
  try {
    window.localStorage.setItem(
      ATTRIBUTION_STORAGE_KEY,
      serializeAttribution(attribution),
    );
  } catch {
    // private mode / quota — cookie still carries attribution across OAuth
  }
}

function clearAttribution() {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const expired = `${ATTRIBUTION_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
  document.cookie = expired;
  if (isDeltalytixHost(window.location.hostname)) {
    document.cookie = `${expired}; Domain=.deltalytix.app`;
  }
  try {
    window.localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
  } catch {
    // private mode — nothing was stored there
  }
}

function registerWithPostHog(attribution: Attribution) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
  if (posthog.has_opted_out_capturing()) return;

  const props = attributionToPostHogProperties(attribution);
  if (Object.keys(props).length === 0) return;

  // Super properties attach to later client events (e.g. marketing_cta_clicked).
  // Person properties are set server-side at sign-up and purchase instead: doing
  // it here would create a profile for every anonymous visitor on a campaign
  // link, which `identified_only` person processing exists to avoid.
  posthog.register(props);
}

/**
 * Captures utm_* / gclid from the current URL on every app origin (marketing +
 * app). Persists first-touch attribution in a SameSite=Lax cookie so Google
 * OAuth redirects do not wipe campaign context.
 *
 * Capture is re-attempted when the banner reports a decision, so a visitor who
 * lands on a campaign URL and accepts on a later page is still attributed —
 * the params are re-read from the URL that is current at that moment, and
 * first-touch merging keeps the earliest values seen after consent.
 */
export function AttributionCapture() {
  useEffect(() => {
    const capture = () => {
      const fromUrl = parseAttributionParams(
        new URLSearchParams(window.location.search),
      );
      bufferedAttribution = mergeAttributionFirstTouch(
        bufferedAttribution,
        fromUrl,
      );

      // Attribution is marketing data, so it follows the Google tag's Consent
      // Mode state (region default or saved decision).
      const consent = resolveClientGoogleConsent();
      const plan = planAttributionStorage({
        stored: readClientAttribution(),
        incoming: bufferedAttribution,
        adStorage: consent.ad_storage === "granted",
        analyticsStorage: consent.analytics_storage === "granted",
      });

      if (plan.action === "clear") clearAttribution();
      if (plan.action !== "persist") return;

      // Re-persist so cookie Max-Age refreshes when we already had storage only.
      persistAttribution(plan.attribution);
      registerWithPostHog(plan.attribution);
    };

    capture();

    const onConsent = () => capture();
    window.addEventListener(CONSENT_UPDATED_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_UPDATED_EVENT, onConsent);
  }, []);

  return null;
}
