import "server-only";

import { cookies, headers } from "next/headers";
import { PostHog } from "posthog-node";

import { ANALYTICS_CONSENT_COOKIE } from "@/lib/consent-settings";
import { readCountryFromHeaders, requiresCookieConsent } from "@/lib/consent-region";
import { isConversionEvent, sanitizeConversionProperties } from "@/lib/conversion-analytics";
import { POSTHOG_API_HOST } from "@/lib/posthog-browser-config";

interface PostHogProperties {
  [key: string]:
    | boolean
    | number
    | string
    | null
    | undefined
    | PostHogProperties;
}

let posthogClient: PostHog | null = null;

function getProjectToken(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
}

function getServerHost(): string {
  return (
    process.env.POSTHOG_SERVER_HOST ??
    process.env.NEXT_PUBLIC_POSTHOG_HOST ??
    POSTHOG_API_HOST
  ).replace(/\/$/, "");
}

function getPostHogClient(): PostHog | null {
  const projectToken = getProjectToken();
  if (!projectToken) return null;

  if (!posthogClient) {
    posthogClient = new PostHog(projectToken, {
      host: getServerHost(),
      // Serverless: flush immediately so the isolate is not frozen mid-batch.
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogClient;
}

export async function readRequestCountry(): Promise<string | null> {
  try {
    return readCountryFromHeaders(await headers());
  } catch {
    return null;
  }
}

export async function hasAnalyticsConsent(): Promise<boolean> {
  try {
    const jar = await cookies();
    const shared = jar.get(ANALYTICS_CONSENT_COOKIE)?.value;
    if (shared === "granted") return true;
    if (shared === "denied") return false;
    return !requiresCookieConsent(await readRequestCountry());
  } catch {
    return !requiresCookieConsent(await readRequestCountry());
  }
}

/** True only for a saved `denied` cookie — not EU pending / no decision. */
export async function hasDeniedAnalyticsCookie(): Promise<boolean> {
  try {
    const jar = await cookies();
    return jar.get(ANALYTICS_CONSENT_COOKIE)?.value === "denied";
  } catch {
    return false;
  }
}

export async function flushPostHog(): Promise<void> {
  if (!posthogClient) return;
  await posthogClient.flush();
}

/**
 * Drain the client before a serverless isolate exits. Safe to call when
 * nothing was captured — posthog-node no-ops on a quiet client.
 */
export async function shutdownPostHog(): Promise<void> {
  if (!posthogClient) return;
  const client = posthogClient;
  posthogClient = null;
  await client.shutdown();
}

/**
 * Returns true when PostHog accepted the event. Callers that treat delivery as
 * best-effort can ignore it; callers with no other durable store (feedback)
 * use it to surface a retry to the user.
 *
 * Conversion events (`user_signed_up`, `checkout_started`,
 * `subscription_purchased`) always skip the browser consent cookie.
 */
export async function capturePostHogEvent({
  consentGranted = false,
  skipConsent = false,
  distinctId,
  event,
  properties = {},
  country,
  consentDenied = false,
}: {
  consentGranted?: boolean;
  skipConsent?: boolean;
  distinctId: string;
  event: string;
  properties?: PostHogProperties;
  country?: string | null;
  consentDenied?: boolean;
}): Promise<boolean> {
  const client = getPostHogClient();
  if (!client) return false;

  const isConversion = skipConsent || isConversionEvent(event);
  if (!isConversion && !consentGranted && !(await hasAnalyticsConsent())) {
    return false;
  }

  const resolvedCountry = country ?? (await readRequestCountry());
  const denied = consentDenied || (await hasDeniedAnalyticsCookie());
  const sanitized = sanitizeConversionProperties(properties, resolvedCountry, {
    consentDenied: denied,
  });

  try {
    client.capture({
      distinctId,
      event,
      properties: {
        $lib: "deltalytix-server",
        ...sanitized,
      },
    });
    await client.flush();
    return true;
  } catch (error) {
    console.warn(`[PostHog] Failed to capture ${event}`, error);
    return false;
  }
}
