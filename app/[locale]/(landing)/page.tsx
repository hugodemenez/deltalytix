import Features from "./components/features";
import OpenSource from "./components/open-source";
import PricingPage from "./pricing/page";
import Partners from "./components/partners";
import FAQ from "./components/faq";
import { setStaticParamsLocale } from "next-international/server";
import Hero from "./components/hero";
import { getStaticParams } from "@/locales/server";

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
