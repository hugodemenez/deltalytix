import "server-only";

import { cookies } from "next/headers";

import {
  ATTRIBUTION_COOKIE,
  type Attribution,
  deserializeAttribution,
  PENDING_PURCHASE_COOKIE,
  PENDING_PURCHASE_MAX_AGE_SECONDS,
  type PendingPurchase,
  serializePendingPurchase,
} from "@/lib/attribution";

function cookieSecureSuffix(): string {
  // Checkout and auth callbacks are HTTPS in production; local http is fine without Secure.
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

function cookieDomainSuffix(): string {
  // Mirror consent-banner sharing across apex + www + beta.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  if (siteUrl.includes("deltalytix.app") || process.env.VERCEL_ENV === "production") {
    return "; Domain=.deltalytix.app";
  }
  return "";
}

export async function readAttributionFromCookies(): Promise<Attribution | null> {
  try {
    const raw = (await cookies()).get(ATTRIBUTION_COOKIE)?.value;
    if (!raw) return null;
    // Cookies may be stored encoded or plain JSON depending on writer.
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      decoded = raw;
    }
    return deserializeAttribution(decoded);
  } catch {
    return null;
  }
}

export async function readUserCountryFromCookies(): Promise<string | null> {
  try {
    const country = (await cookies()).get("user-country")?.value.trim();
    return country ? country.toUpperCase() : null;
  } catch {
    return null;
  }
}

export function pendingPurchaseSetCookieHeader(purchase: PendingPurchase): string {
  const value = encodeURIComponent(serializePendingPurchase(purchase));
  return `${PENDING_PURCHASE_COOKIE}=${value}; Max-Age=${PENDING_PURCHASE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${cookieSecureSuffix()}${cookieDomainSuffix()}`;
}
