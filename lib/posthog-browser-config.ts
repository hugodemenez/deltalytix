/**
 * Browser PostHog init — first-party ingest proxy, regional consent,
 * cookieless anonymous capture before EU opt-in, masked replay.
 */

export const POSTHOG_INGEST_PATH = "/ingest";
export const POSTHOG_UI_HOST = "https://eu.posthog.com";
export const POSTHOG_API_HOST = "https://eu.i.posthog.com";
export const POSTHOG_ASSETS_HOST = "https://eu-assets.i.posthog.com";

export type PostHogBrowserInitInput = {
  /** Identified / cookie analytics granted (banner accept or US default). */
  identifiedConsent: boolean;
  /** True for EEA/UK/CH or unknown country. */
  requiresCookieConsent: boolean;
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
 * EU / unknown, no accept yet: `cookieless_mode: 'on_reject'` plus
 * `opt_out_capturing_by_default` so pending consent is treated as rejected.
 * posthog-js then captures anonymously (no cookies, no localStorage, no
 * stored id, no replay) instead of dropping every event.
 *
 * After opt-in, or outside the consent region, cookies and masked replay
 * are allowed.
 */
export function buildPostHogBrowserInitConfig({
  identifiedConsent,
  requiresCookieConsent,
}: PostHogBrowserInitInput): PostHogBrowserInitConfig {
  const cookielessUntilIdentified = requiresCookieConsent && !identifiedConsent;

  return {
    api_host: POSTHOG_INGEST_PATH,
    ui_host: POSTHOG_UI_HOST,
    defaults: "2026-05-30",
    person_profiles: "identified_only",
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
    ...(cookielessUntilIdentified ? { cookieless_mode: "on_reject" as const } : {}),
    opt_out_capturing_by_default: cookielessUntilIdentified,
    ...(cookielessUntilIdentified ? { persistence: "memory" as const } : {}),
    disable_session_recording: !identifiedConsent,
    session_recording: { maskAllInputs: true },
  };
}

/** Replay is allowed only after identified consent (EU accept, or US default). */
export function shouldStartSessionRecording(identifiedConsent: boolean): boolean {
  return identifiedConsent;
}
