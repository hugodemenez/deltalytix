import Features from "./components/features";
import OpenSource from "./components/open-source";
import PricingPage from "./pricing/page";
import Partners from "./components/partners";
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
    <div className="flex flex-col min-h-dvh text-gray-900 dark:text-white transition-colors duration-300">
      <main className="flex-1">
        <section id="" className="w-full py-14 md:py-12 lg:py-16 xl:py-24">
          <Hero />
        </section>
        <section
          id="partners"
          className="w-full py-6 md:py-12 lg:py-16 xl:py-24"
        >
          <Partners />
        </section>
        <section
          id="features"
          className="w-full py-6 md:py-12 lg:py-16 xl:py-24"
        >
          <Features />
        </section>
        <section
          id="pricing"
          className="w-full py-6 md:py-12 lg:py-16 xl:py-24"
        >
          <PricingPage />
        </section>
        <section
          id="open-source"
          className="w-full py-6 md:py-12 lg:py-16 xl:py-24"
        >
          <OpenSource />
        </section>
      </main>
    </div>
  );
}
