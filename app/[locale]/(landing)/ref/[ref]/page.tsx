import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isValidReferralSlug } from "@/lib/referral-url";
import { siteUrl } from "@/lib/site-url";
import { getSiteMetadataCopy } from "@/lib/og/site-metadata";

type PageProps = {
  params: Promise<{ locale: string; ref: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, ref } = await params;

  if (!isValidReferralSlug(ref)) {
    return {};
  }

  const siteCopy = getSiteMetadataCopy(locale);
  const title = locale === "fr"
    ? `Rejoignez Deltalytix avec le code ${ref.toUpperCase()}`
    : `Join Deltalytix with Referral Code ${ref.toUpperCase()}`;
  const description = siteCopy.description;
  const url = siteUrl(`/${locale}/ref/${encodeURIComponent(ref)}`);
  const openGraphLocale = locale === "fr" ? "fr_FR" : "en_US";

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Deltalytix",
      locale: openGraphLocale,
      // og:image is injected automatically from colocated opengraph-image.tsx.
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
