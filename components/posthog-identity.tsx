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
  const identify = useCallback(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
    if (posthog.has_opted_out_capturing()) return;

    posthog.identify(userId, {
      email,
      language,
    });
  }, [email, language, userId]);

  useEffect(() => {
    identify();
    window.addEventListener(CONSENT_EVENT, identify);
    return () => window.removeEventListener(CONSENT_EVENT, identify);
  }, [identify]);

  return null;
}
