import posthog from "posthog-js";

import { hasClientAnalyticsConsent } from "@/lib/consent-settings";
import { readClientCountry, requiresCookieConsent } from "@/lib/consent-region";
import { buildPostHogBrowserInitConfig } from "@/lib/posthog-browser-config";
import { syncPostHogSessionRecording } from "@/lib/posthog-session-recording";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (projectToken) {
  const identifiedConsent = hasClientAnalyticsConsent();
  const countryRequiresConsent = requiresCookieConsent(readClientCountry());

  posthog.init(projectToken, buildPostHogBrowserInitConfig({
    identifiedConsent,
    requiresCookieConsent: countryRequiresConsent,
  }));

  // Replay is on in PostHog project 50101. Do not hard-disable it here —
  // start only with identified analytics consent, and stop otherwise.
  // Inputs are always masked via session_recording.maskAllInputs.
  syncPostHogSessionRecording(posthog, identifiedConsent);
}

export { posthog };
