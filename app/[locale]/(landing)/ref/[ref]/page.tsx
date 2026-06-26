import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setStaticParamsLocale } from "next-international/server";
import { getReferralOgCopy } from "@/lib/og/referral-copy";
import { isValidReferralSlug } from "@/lib/referral-url";
import { siteUrl } from "@/lib/site-url";

type PageProps = {
  params: Promise<{ locale: string; ref: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, ref } = await params;

  if (!isValidReferralSlug(ref)) {
    return {};
  }

  setStaticParamsLocale(locale);
  const copy = await getReferralOgCopy(locale);
  const url = siteUrl(`/${locale}/ref/${encodeURIComponent(ref)}`);
  const openGraphLocale = locale === "fr" ? "fr_FR" : "en_US";

  return {
    title: copy.joinLabel,
    description: copy.tagline,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: copy.joinLabel,
      description: copy.tagline,
      url,
      siteName: "Deltalytix",
      locale: openGraphLocale,
      // og:image is injected automatically from colocated opengraph-image.tsx.
    },
    twitter: {
      card: "summary_large_image",
      title: copy.joinLabel,
      description: copy.tagline,
      // twitter:image is also derived from opengraph-image.tsx.
    },
  };
}

export default async function ReferralLandingPage({ params }: PageProps) {
  const { locale, ref } = await params;

  if (!isValidReferralSlug(ref)) {
    redirect(`/${locale}`);
  }

  redirect(`/${locale}?ref=${encodeURIComponent(ref)}`);
}
