import { getReferralOgCopy } from "@/lib/og/referral-copy";
import { createMarketingOgImageResponse } from "@/lib/og/shared";
import {
  createReferralOgImageResponse,
  referralOgSize,
} from "@/lib/og/referral-opengraph";
import { getSiteMetadataCopy } from "@/lib/og/site-metadata";
import { isValidReferralSlug } from "@/lib/referral-url";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref");
  const locale = searchParams.get("locale") ?? "en";
  const hasReferral = Boolean(ref && ref !== "Direct" && isValidReferralSlug(ref));

  if (hasReferral) {
    const copy = await getReferralOgCopy(locale);
    return createReferralOgImageResponse({
      ref: ref!,
      joinLabel: copy.joinLabel,
      tagline: copy.tagline,
      cta: copy.cta,
    });
  }

  const siteCopy = getSiteMetadataCopy(locale);
  return createMarketingOgImageResponse({
    headline: siteCopy.ogHeadline,
    subheadline: siteCopy.ogSubheadline,
    cta: siteCopy.ogCta,
  });
}

export { referralOgSize as size };
