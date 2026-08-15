import { createMarketingOgImageResponse } from "@/lib/og/shared";
import { getSiteMetadataCopy } from "@/lib/og/site-metadata";

export const alt = getSiteMetadataCopy("en").ogAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const copy = getSiteMetadataCopy("en");

  return createMarketingOgImageResponse({
    headline: copy.ogHeadline,
    subheadline: copy.ogSubheadline,
    cta: copy.ogCta,
  });
}
