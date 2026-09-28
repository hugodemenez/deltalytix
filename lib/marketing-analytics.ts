import posthog from "posthog-js";

import {
  attributionToPostHogProperties,
  readClientAttribution,
} from "@/lib/attribution";

function canCapture() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return false;
  if (typeof window === "undefined") return false;
  // `is_capturing()` is true in EU cookieless mode before the banner is
  // answered; `has_opted_out_capturing()` is not.
  return posthog.is_capturing();
}

export function captureMarketingCtaClicked({
  ctaId,
  destination,
  locale,
  placement,
}: {
  ctaId: string;
  destination: string;
  locale: string;
  placement: string;
}) {
  if (!canCapture()) return;

  const attributionProps = attributionToPostHogProperties(readClientAttribution());

  posthog.capture("marketing_cta_clicked", {
    cta_id: ctaId,
    destination,
    locale,
    placement,
    ...attributionProps,
  });
}
