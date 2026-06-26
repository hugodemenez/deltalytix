import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/site-url";

type PageProps = {
  params: Promise<{ locale: string; ref: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ref } = await params;
  const ogImageUrl = siteUrl(`/api/og?ref=${encodeURIComponent(ref)}`);

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
  redirect(`/${locale}?ref=${encodeURIComponent(ref)}`);
}
