import posthog from "posthog-js";

import { hasClientAnalyticsConsent } from "@/lib/consent-settings";
import { syncPostHogSessionRecording } from "@/lib/posthog-session-recording";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

if (projectToken) {
  const analyticsConsent = hasClientAnalyticsConsent();

  posthog.init(projectToken, {
    api_host: apiHost,
    defaults: "2026-05-30",
    person_profiles: "identified_only",
    opt_out_capturing_by_default: !analyticsConsent,
    opt_out_capturing_persistence_type: "localStorage",
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
  });

  // Replay is on in PostHog project 50101. Do not hard-disable it here —
  // start only with analytics consent, and stop if that consent is missing.
  syncPostHogSessionRecording(posthog, analyticsConsent);
}

export { posthog };
