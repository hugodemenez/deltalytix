import { createMarketingOgImageResponse } from "@/lib/og/shared";
import { getSiteMetadataCopy } from "@/lib/og/site-metadata";

export const alt = "Deltalytix trading analytics dashboard — Get Started Free";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const runtime = "nodejs";
export const revalidate = 3600;

export default function Image() {
  const copy = getSiteMetadataCopy("en");

  return createMarketingOgImageResponse({
    headline: copy.ogHeadline,
    subheadline: copy.ogSubheadline,
    cta: copy.ogCta,
  });
}
