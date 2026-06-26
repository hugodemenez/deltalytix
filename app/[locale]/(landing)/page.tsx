import nextDynamic from "next/dynamic";
import Partners from "./components/partners";
import { setStaticParamsLocale } from "next-international/server";
import Hero from "./components/hero";
import { getStaticParams } from "@/locales/server";
import { DeferredLandingSections } from "./components/deferred-sections";
import { OpenSourceSectionSkeleton } from "./components/section-skeletons";

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
    <main className="flex flex-col sm:gap-28">
      <section id="" className="w-full py-14 md:py-12 lg:py-16 xl:py-24">
        <Hero />
      </section>
      <section id="partners" className="w-full">
        <Partners />
      </section>
      <DeferredLandingSections />
      <section id="open-source" className="w-full">
        <OpenSource />
      </section>
    </main>
  );
}
