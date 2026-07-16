import posthog from "posthog-js";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

function hasAnalyticsConsent() {
  try {
    const storedConsent = localStorage.getItem("cookieConsent");
    if (!storedConsent) return false;

    return JSON.parse(storedConsent).analytics_storage === true;
  } catch {
    return false;
  }
}

if (projectToken) {
  posthog.init(projectToken, {
    api_host: apiHost,
    defaults: "2026-05-30",
    person_profiles: "identified_only",
    opt_out_capturing_by_default: !hasAnalyticsConsent(),
    opt_out_capturing_persistence_type: "local_storage",
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
    disable_session_recording: true,
  });
}

export { posthog };
