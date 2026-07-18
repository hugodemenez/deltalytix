import { cacheLife } from "next/cache";
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

export function generateStaticParams() {
  return getStaticParams();
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  "use cache";
  cacheLife("max");

  const { locale } = await params;
  setStaticParamsLocale(locale);

  return (
    <main className="flex flex-col">
      <section className="w-full shadow-[0_1px_0_0_oklch(0_0_0/0.06)] dark:shadow-[0_1px_0_0_oklch(1_0_0/0.08)]">
        <Hero />
      </section>
      <section
        id="partners"
        className="w-full py-10 shadow-[0_1px_0_0_oklch(0_0_0/0.06)] dark:shadow-[0_1px_0_0_oklch(1_0_0/0.08)] md:py-12"
      >
        <Partners />
      </section>
      <section
        id="features"
        className="w-full shadow-[0_1px_0_0_oklch(0_0_0/0.06)] dark:shadow-[0_1px_0_0_oklch(1_0_0/0.08)]"
      >
        <Features />
      </section>
      <section
        id="pricing"
        className="w-full shadow-[0_1px_0_0_oklch(0_0_0/0.06)] dark:shadow-[0_1px_0_0_oklch(1_0_0/0.08)]"
      >
        <PricingPage />
      </section>
      <section
        id="faq"
        className="w-full py-16 shadow-[0_1px_0_0_oklch(0_0_0/0.06)] dark:shadow-[0_1px_0_0_oklch(1_0_0/0.08)] md:py-24"
      >
        <FAQ />
      </section>
      <section id="open-source" className="w-full py-16 md:py-24">
        <OpenSource />
      </section>
    </main>
  );
}
