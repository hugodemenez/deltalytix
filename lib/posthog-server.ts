import "server-only";

import { cookies } from "next/headers";

const ANALYTICS_CONSENT_COOKIE = "deltalytix_analytics_consent";

type PostHogPropertyValue =
  | boolean
  | number
  | string
  | null
  | undefined
  | Record<string, boolean | number | string | null | undefined>;

type PostHogProperties = Record<string, PostHogPropertyValue>;

export async function hasAnalyticsConsent(): Promise<boolean> {
  try {
    return (await cookies()).get(ANALYTICS_CONSENT_COOKIE)?.value === "granted";
  } catch {
    return false;
  }
}

/**
 * Returns true when PostHog accepted the event. Callers that treat delivery as
 * best-effort can ignore it; callers with no other durable store (feedback)
 * use it to surface a retry to the user.
 */
export async function capturePostHogEvent({
  consentGranted = false,
  distinctId,
  event,
  properties = {},
}: {
  consentGranted?: boolean;
  distinctId: string;
  event: string;
  properties?: PostHogProperties;
}): Promise<boolean> {
  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!projectToken || (!consentGranted && !(await hasAnalyticsConsent()))) return false;

  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

  try {
    const response = await fetch(`${apiHost.replace(/\/$/, "")}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: projectToken,
        event,
        properties: {
          distinct_id: distinctId,
          $lib: "deltalytix-server",
          ...properties,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });

    if (!response.ok) {
      console.warn(`[PostHog] Failed to capture ${event}: ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn(`[PostHog] Failed to capture ${event}`, error);
    return false;
  }
}
