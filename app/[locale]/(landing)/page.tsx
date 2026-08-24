import Partners from "./components/partners";
import { setStaticParamsLocale } from "next-international/server";
import Hero from "./components/hero";
import { getStaticParams } from "@/locales/server";

// Every section is imported statically.
//
// They used to be `next/dynamic` boundaries. A `next/dynamic` boundary is a
// Suspense boundary, and with Cache Components its fallback - not the section -
// is what lands in the prerendered shell, so none of this copy reached the raw
// HTML: a crawler or agent that does not run JavaScript saw four skeletons and
// ~270 characters of text. Importing the sections directly puts their copy in
// the prerendered HTML. See `landing-ssr-content.test.ts`.
import Features from "./components/features";
import PricingPage from "./pricing/page";
import FAQ from "./components/faq";
import OpenSource from "./components/open-source";

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
        <PricingPage embedded />
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
