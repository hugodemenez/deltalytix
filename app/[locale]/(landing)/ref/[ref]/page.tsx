import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isValidReferralSlug } from "@/lib/referral-url";
import { siteUrl } from "@/lib/site-url";

type PageProps = {
  params: Promise<{ locale: string; ref: string }>;
};

const SHARE_DESCRIPTIONS: Record<string, string> = {
  en: "Centralize and visualize your trading performance across multiple brokers. Track, analyze, and improve your trading journey with powerful analytics.",
  fr: "Centralisez et visualisez vos performances de trading à travers différents brokers. Suivez, analysez et améliorez votre parcours de trading avec des analyses puissantes.",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, ref } = await params;

  if (!isValidReferralSlug(ref)) {
    return {};
  }

  const description = SHARE_DESCRIPTIONS[locale] ?? SHARE_DESCRIPTIONS.en;
  const url = siteUrl(`/${locale}/ref/${encodeURIComponent(ref)}`);
  const openGraphLocale = locale === "fr" ? "fr_FR" : "en_US";

  return {
    title: "Deltalytix",
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: "Deltalytix",
      description,
      url,
      siteName: "Deltalytix",
      locale: openGraphLocale,
      // og:image is injected automatically from colocated opengraph-image.tsx.
    },
    twitter: {
      card: "summary_large_image",
      title: "Deltalytix",
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
