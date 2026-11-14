"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { hasClientAnalyticsConsent } from "@/lib/consent-settings";

/**
 * Always mount Vercel Web Analytics and Speed Insights, and drop events
 * when product-use / analytics consent is not granted. `beforeSend` applies
 * opt-out immediately without a reload.
 */
export function ConsentGatedVercelAnalytics() {
  return (
    <>
      <SpeedInsights
        beforeSend={(event) =>
          hasClientAnalyticsConsent() ? event : null
        }
      />
      <Analytics
        beforeSend={(event) =>
          hasClientAnalyticsConsent() ? event : null
        }
      />
    </>
  );
}
