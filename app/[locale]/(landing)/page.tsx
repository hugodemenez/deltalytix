import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import Partners from "./components/partners";
import { setStaticParamsLocale } from "next-international/server";
import Hero from "./components/hero";
import { getStaticParams } from "@/locales/server";
import { siteUrl } from "@/lib/site-url";
import {
  FAQSectionSkeleton,
  FeaturesSectionSkeleton,
  OpenSourceSectionSkeleton,
  PricingSectionSkeleton,
} from "./components/section-skeletons";

const Features = nextDynamic(() => import("./components/features"), {
  loading: () => <FeaturesSectionSkeleton />,
});

const PricingPage = nextDynamic(() => import("./pricing/page"), {
  loading: () => <PricingSectionSkeleton />,
});

const FAQ = nextDynamic(() => import("./components/faq"), {
  loading: () => <FAQSectionSkeleton />,
});

const OpenSource = nextDynamic(() => import("./components/open-source"), {
  loading: () => <OpenSourceSectionSkeleton />,
});

export function generateStaticParams() {
  return getStaticParams();
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}): Promise<Metadata> {
  const { ref } = await searchParams;

  if (!ref) {
    return {};
  }

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

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setStaticParamsLocale(locale);

  return (
    <main className="flex flex-col sm:gap-28">
      <section id="" className="w-full py-14 md:py-12 lg:py-16 xl:py-24">
        <Hero />
      </section>
      <section
        id="partners"
        className="w-full"
      >
        <Partners />
      </section>
      <section
        id="features"
        className="w-full"
      >
        <Features />
      </section>
      <section
        id="pricing"
        className="w-full"
      >
        <PricingPage />
      </section>
      <section
        id="faq"
        className="w-full"
      >
        <FAQ />
      </section>
      <section
        id="open-source"
        className="w-full"
      >
        <OpenSource />
      </section>
    </main>
  );
}
