/**
 * Browser PostHog init — first-party ingest proxy, regional consent,
 * cookieless anonymous capture before EU opt-in, masked replay.
 */

import {
  hasAnalyticsConsentFromStores,
  isExplicitAnalyticsDenialFromStores,
  type ConsentSettings,
} from "@/lib/consent-settings";
import { requiresCookieConsent as countryRequiresCookieConsent } from "@/lib/consent-region";

export const POSTHOG_INGEST_PATH = "/ingest";
export const POSTHOG_UI_HOST = "https://eu.posthog.com";
export const POSTHOG_API_HOST = "https://eu.i.posthog.com";
export const POSTHOG_ASSETS_HOST = "https://eu-assets.i.posthog.com";

export type PostHogBrowserInitInput = {
  /** Identified / cookie analytics granted (banner accept or US default). */
  identifiedConsent: boolean;
  /** True for EEA/UK/CH or unknown country. */
  requiresCookieConsent: boolean;
  /**
   * Saved refusal (`deltalytix_analytics_consent=denied` or localStorage).
   * Distinct from EU “no decision yet”, which still allows cookieless counts.
   */
  explicitDenial?: boolean;
};

export type PostHogSessionRecordingInit = {
  maskAllInputs: true;
};

export type PostHogBrowserInitConfig = {
  api_host: typeof POSTHOG_INGEST_PATH;
  ui_host: typeof POSTHOG_UI_HOST;
  defaults: "2026-05-30";
  person_profiles: "identified_only";
  autocapture: false;
  capture_pageview: boolean;
  capture_pageleave: boolean;
  cookieless_mode?: "on_reject";
  opt_out_capturing_by_default: boolean;
  persistence?: "memory" | "localStorage+cookie";
  disable_session_recording: boolean;
  session_recording: PostHogSessionRecordingInit;
};

/**
 * Resolve init flags from the same stores PostHog reads at boot, so a US
 * footer opt-out is visible before the first `$pageview`.
 */
export function resolvePostHogBrowserInitInput({
  cookieHeader,
  storedConsent,
  country,
}: {
  cookieHeader: string;
  storedConsent: Partial<ConsentSettings> | null;
  country: string | null;
}): PostHogBrowserInitInput {
  return {
    identifiedConsent: hasAnalyticsConsentFromStores({
      cookieHeader,
      storedConsent,
      country,
    }),
    requiresCookieConsent: countryRequiresCookieConsent(country),
    explicitDenial: isExplicitAnalyticsDenialFromStores({
      cookieHeader,
      storedConsent,
    }),
  };
}

/**
 * EU / unknown, no decision yet: `cookieless_mode: 'on_reject'` plus
 * `opt_out_capturing_by_default` so pending consent is treated as rejected.
 * posthog-js then captures anonymously (no cookies, no localStorage, no
 * stored id, no replay) instead of dropping every event.
 *
 * Explicit denial (any region, including a US CCPA-style opt-out): no
 * browser capture at all. Cookieless anonymous counts would satisfy
 * opt-out of sale/sharing; we take the stricter option so `ph_*` cookies
 * and an identified pageview cannot land before ConsentRuntime runs.
 *
 * After opt-in, or outside the consent region with no saved refusal,
 * cookies and masked replay are allowed.
 */
export function buildPostHogBrowserInitConfig({
  identifiedConsent,
  requiresCookieConsent,
  explicitDenial = false,
}: PostHogBrowserInitInput): PostHogBrowserInitConfig {
  const cookielessAnonymous =
    requiresCookieConsent && !identifiedConsent && !explicitDenial;
  const disableBrowserCapture = explicitDenial || (!identifiedConsent && !cookielessAnonymous);

  return {
    api_host: POSTHOG_INGEST_PATH,
    ui_host: POSTHOG_UI_HOST,
    defaults: "2026-05-30",
    person_profiles: "identified_only",
    autocapture: false,
    capture_pageview: !disableBrowserCapture,
    capture_pageleave: !disableBrowserCapture,
    ...(cookielessAnonymous ? { cookieless_mode: "on_reject" as const } : {}),
    opt_out_capturing_by_default: !identifiedConsent,
    ...(!identifiedConsent ? { persistence: "memory" as const } : {}),
    disable_session_recording: !identifiedConsent,
    session_recording: { maskAllInputs: true },
  };
}

/** Replay is allowed only after identified consent (EU accept, or US default). */
export function shouldStartSessionRecording(identifiedConsent: boolean): boolean {
  return identifiedConsent;
}
