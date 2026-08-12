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
  mergeAttributionFirstTouch,
  parseAttributionParams,
  readClientAttribution,
  serializeAttribution,
} from "@/lib/attribution";

function isDeltalytixHost() {
  const host = window.location.hostname;
  return host === "deltalytix.app" || host.endsWith(".deltalytix.app");
}

function writeAttributionCookie(attribution: Attribution) {
  const value = encodeURIComponent(serializeAttribution(attribution));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const attributes = `Max-Age=${ATTRIBUTION_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;

  document.cookie = `${ATTRIBUTION_COOKIE}=${value}; ${attributes}`;
  if (isDeltalytixHost()) {
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
  posthog.register(props);
  // Second arg is $set_once — keep first-touch campaign props on the person.
  posthog.setPersonProperties({}, props);
}

/**
 * Captures utm_* / gclid from the current URL on every app origin (marketing +
 * app). Persists first-touch attribution in a SameSite=Lax cookie so Google
 * OAuth redirects do not wipe campaign context.
 */
export function AttributionCapture() {
  useEffect(() => {
    const fromUrl = parseAttributionParams(
      new URLSearchParams(window.location.search),
    );
    const existing = readClientAttribution();
    const merged = mergeAttributionFirstTouch(existing, fromUrl);

    if (!hasAttribution(merged)) return;

    // Re-persist so cookie Max-Age refreshes when we already had storage only.
    persistAttribution(merged);
    registerWithPostHog(merged);
  }, []);

  return null;
}
