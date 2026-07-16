import "server-only";

import { cookies } from "next/headers";

const ANALYTICS_CONSENT_COOKIE = "deltalytix_analytics_consent";

type PostHogProperties = Record<string, boolean | number | string | null | undefined>;

export async function hasAnalyticsConsent(): Promise<boolean> {
  try {
    return (await cookies()).get(ANALYTICS_CONSENT_COOKIE)?.value === "granted";
  } catch {
    return false;
  }
}

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
}) {
  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!projectToken || (!consentGranted && !(await hasAnalyticsConsent()))) return;

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
    }
  } catch (error) {
    console.warn(`[PostHog] Failed to capture ${event}`, error);
  }
}
