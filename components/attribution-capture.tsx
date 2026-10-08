"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE_SECONDS,
  ATTRIBUTION_STORAGE_KEY,
  type Attribution,
  attributionToPostHogProperties,
  hasAttribution,
  isDeltalytixHost,
  mergeAttributionFirstTouch,
  parseAttributionParams,
  readClientAttribution,
  serializeAttribution,
  withoutClickIds,
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

/**
 * Attribution is marketing data, not a functional requirement, so it follows
 * the Google tag's Consent Mode state (region default or saved decision):
 * nothing is written unless analytics or ad storage is granted, and the Google
 * click ids are only written with ad storage granted.
 */
function storableAttribution(attribution: Attribution): Attribution | null {
  const consent = resolveClientGoogleConsent();
  const adStorage = consent.ad_storage === "granted";
  if (!adStorage && consent.analytics_storage !== "granted") return null;
  return adStorage ? attribution : withoutClickIds(attribution);
}

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

      const merged = storableAttribution(
        mergeAttributionFirstTouch(readClientAttribution(), bufferedAttribution),
      );

      if (!merged || !hasAttribution(merged)) return;

      // Re-persist so cookie Max-Age refreshes when we already had storage only.
      persistAttribution(merged);
      registerWithPostHog(merged);
    };

    capture();

    const onConsent = () => capture();
    window.addEventListener(CONSENT_UPDATED_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_UPDATED_EVENT, onConsent);
  }, []);

  return null;
}
