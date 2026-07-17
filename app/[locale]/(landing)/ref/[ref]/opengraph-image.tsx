import { getReferralOgCopy } from "@/lib/og/referral-copy";
import {
  createReferralOgImageResponse,
  referralOgSize,
} from "@/lib/og/referral-opengraph";
import { isValidReferralSlug } from "@/lib/referral-url";

export const alt = "Deltalytix referral — Sign up with an invite code";
export const size = referralOgSize;
export const contentType = "image/png";

export const runtime = "nodejs";
export const revalidate = 3600;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; ref: string }>;
}) {
  const { locale, ref } = await params;

  if (!isValidReferralSlug(ref)) {
    return new Response("Referral not found", { status: 404 });
  }

  const copy = await getReferralOgCopy(locale);

  return createReferralOgImageResponse({
    ref,
    joinLabel: copy.joinLabel,
    tagline: copy.tagline,
    cta: copy.cta,
  });
}
