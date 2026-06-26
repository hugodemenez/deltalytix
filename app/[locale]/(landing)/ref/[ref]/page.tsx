import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isValidReferralSlug } from "@/lib/referral-url";
import { getRequestOrigin, siteUrl } from "@/lib/site-url";

type PageProps = {
  params: Promise<{ locale: string; ref: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ref } = await params;

  if (!isValidReferralSlug(ref)) {
    return {};
  }

  const requestHeaders = await headers();
  const origin = getRequestOrigin(requestHeaders);
  const ogImageUrl = siteUrl(`/api/og?ref=${encodeURIComponent(ref)}`, origin);

  return {
    openGraph: {
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: "Deltalytix Open Graph Image",
        },
      ],
    },
    twitter: {
      images: [ogImageUrl],
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
