"use client";

import { useCallback, useEffect } from "react";
import posthog from "posthog-js";

const CONSENT_EVENT = "deltalytix:analytics-consent";

export function PostHogIdentity({
  email,
  language,
  userId,
}: {
  email: string;
  language: string;
  userId: string;
}) {
  const syncIdentity = useCallback(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;

    // Prefer the in-app locale over browser language for survey translations.
    posthog.config.override_display_language = language;

    // Keep email/language available for feature-flag targeting even when analytics is opted out.
    posthog.setPersonPropertiesForFlags({ email, language });

    if (posthog.has_opted_out_capturing()) return;

    posthog.identify(userId, {
      email,
      language,
    });
  }, [email, language, userId]);

  useEffect(() => {
    syncIdentity();
    window.addEventListener(CONSENT_EVENT, syncIdentity);
    return () => window.removeEventListener(CONSENT_EVENT, syncIdentity);
  }, [syncIdentity]);

  return null;
}
