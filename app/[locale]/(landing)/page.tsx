import nextDynamic from "next/dynamic";
import Partners from "./components/partners";
import { setStaticParamsLocale } from "next-international/server";
import Hero from "./components/hero";
import { getStaticParams } from "@/locales/server";
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

export const dynamic = "force-static";

export function generateStaticParams() {
  return getStaticParams();
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setStaticParamsLocale(locale);

  return (
    <main className="flex flex-col">
      <section className="w-full border-b border-black/10 dark:border-white/10">
        <Hero />
      </section>
      <section
        id="partners"
        className="w-full border-b border-black/10 py-10 dark:border-white/10 md:py-12"
      >
        <Partners />
      </section>
      <section
        id="features"
        className="w-full border-b border-black/10 dark:border-white/10"
      >
        <Features />
      </section>
      <section
        id="pricing"
        className="w-full border-b border-black/10 dark:border-white/10"
      >
        <PricingPage />
      </section>
      <section
        id="faq"
        className="w-full border-b border-black/10 py-16 dark:border-white/10 md:py-24"
      >
        <FAQ />
      </section>
      <section id="open-source" className="w-full py-16 md:py-24">
        <OpenSource />
      </section>
    </main>
  );
}
