"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useEffect, useState } from "react";

import {
  CONSENT_RESET_EVENT,
  CONSENT_UPDATED_EVENT,
  hasClientAnalyticsConsent,
} from "@/lib/consent-settings";

/**
 * Mount Vercel Web Analytics and Speed Insights only when product-use /
 * analytics consent is granted (or regional default allows measurement).
 * When the visitor opts out, these scripts are not rendered.
 */
export function ConsentGatedVercelAnalytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(hasClientAnalyticsConsent());
    sync();
    window.addEventListener(CONSENT_UPDATED_EVENT, sync);
    window.addEventListener(CONSENT_RESET_EVENT, sync);
    return () => {
      window.removeEventListener(CONSENT_UPDATED_EVENT, sync);
      window.removeEventListener(CONSENT_RESET_EVENT, sync);
    };
  }, []);

  if (!allowed) return null;

  return (
    <>
      <SpeedInsights />
      <Analytics />
    </>
  );
}
