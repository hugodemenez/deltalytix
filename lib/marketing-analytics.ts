import posthog from "posthog-js";

function canCapture() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return false;
  if (typeof window === "undefined") return false;
  return !posthog.has_opted_out_capturing();
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

  posthog.capture("marketing_cta_clicked", {
    cta_id: ctaId,
    destination,
    locale,
    placement,
  });
}
