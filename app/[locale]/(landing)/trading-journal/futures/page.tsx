import { cacheLife } from "next/cache";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { getStaticParams as getLocaleStaticParams } from "@/locales/server";
import { getHubJournalRows } from "@/lib/compare";
import { siteUrl } from "@/lib/site-url";
import { LANDING_SECTION_CONTAINER_CLASSNAME } from "../../components/landing-section-container";
import { getCompareCopy } from "../compare-copy";
import { CompareCtas } from "../components/compare-ctas";
import { JournalsIndex } from "../components/journals-index";

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

export function generateStaticParams() {
  return getLocaleStaticParams();
}

async function getCachedHubMetadata(locale: string): Promise<Metadata> {
  "use cache";
  cacheLife("max");

  const copy = getCompareCopy(locale);
  const url = siteUrl(`/${locale}/trading-journal/futures`);

  return {
    title: copy.hub.title,
    description: copy.hub.lede,
    alternates: {
      canonical: url,
      languages: {
        en: siteUrl("/en/trading-journal/futures"),
        fr: siteUrl("/fr/trading-journal/futures"),
      },
    },
    openGraph: {
      title: copy.hub.title,
      description: copy.hub.lede,
      url,
      siteName: "Deltalytix",
      locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: copy.hub.title,
      description: copy.hub.lede,
    },
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return getCachedHubMetadata(locale);
}

async function CachedCompareHub({ locale }: { locale: string }) {
  "use cache";
  cacheLife("max");

  setStaticParamsLocale(locale);

  const copy = getCompareCopy(locale);
  const journals = await getHubJournalRows(locale);

  return (
    <main className="min-h-screen">
      <header className="border-b border-[#E5E5E5] dark:border-white/10">
        <div
          className={`${LANDING_SECTION_CONTAINER_CLASSNAME} py-16 sm:py-24 lg:py-32`}
        >
          <p className="mb-6 text-sm text-black/45 dark:text-white/45">
            {copy.hub.eyebrow}
          </p>
          <h1 className="max-w-[960px] text-balance text-[clamp(3rem,7.2vw,7.25rem)] font-normal leading-[1.12] tracking-[-0.06em] sm:leading-[1.06] md:leading-[1] lg:leading-[0.96]">
            {copy.hub.title}
          </h1>
          <p className="mt-7 max-w-[680px] text-pretty text-lg leading-relaxed text-black/60 dark:text-white/60 md:text-xl">
            {copy.hub.lede}
          </p>
          <div className="mt-8">
            <CompareCtas locale={locale} placement="compare_hub_hero" />
          </div>
        </div>
      </header>

      <section className="border-b border-[#E5E5E5] dark:border-white/10">
        <div
          className={`${LANDING_SECTION_CONTAINER_CLASSNAME} py-12 md:py-16`}
        >
          <JournalsIndex journals={journals} locale={locale} />
        </div>
      </section>

      <section>
        <div
          className={`${LANDING_SECTION_CONTAINER_CLASSNAME} py-16 sm:py-24`}
        >
          <h2 className="max-w-[900px] text-balance text-[clamp(2.5rem,6vw,5.5rem)] font-normal leading-[0.96] tracking-[-0.055em]">
            {copy.hub.afterHeading}
          </h2>
          <p className="mt-5 max-w-[640px] text-pretty text-base leading-relaxed text-black/45 dark:text-white/45 md:text-lg">
            {copy.hub.afterLede}
          </p>
          <div className="mt-8">
            <CompareCtas locale={locale} placement="compare_hub" />
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function CompareHubPage(props: PageProps) {
  const { locale } = await props.params;
  return <CachedCompareHub locale={locale} />;
}
