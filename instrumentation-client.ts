import posthog from "posthog-js";

import { readStoredConsentSettings } from "@/lib/consent-settings";
import { readClientCountry } from "@/lib/consent-region";
import {
  buildPostHogBrowserInitConfig,
  resolvePostHogBrowserInitInput,
} from "@/lib/posthog-browser-config";
import { syncPostHogSessionRecording } from "@/lib/posthog-session-recording";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (projectToken) {
  const initInput = resolvePostHogBrowserInitInput({
    cookieHeader: document.cookie,
    storedConsent: readStoredConsentSettings(),
    country: readClientCountry(),
  });

  posthog.init(projectToken, buildPostHogBrowserInitConfig(initInput));

  // Replay is on in PostHog project 50101. Do not hard-disable it here —
  // start only with identified analytics consent, and stop otherwise.
  // Inputs are always masked via session_recording.maskAllInputs.
  syncPostHogSessionRecording(posthog, initInput.identifiedConsent);
}

export { posthog };
