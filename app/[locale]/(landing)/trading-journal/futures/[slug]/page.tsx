import { cacheLife } from "next/cache";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setStaticParamsLocale } from "next-international/server";
import { getStaticParams as getLocaleStaticParams } from "@/locales/server";
import {
  getCompareJournal,
  getCompareJournalMetadata,
  getLiveCompareMetadata,
} from "@/lib/compare";
import { compareMdxComponents } from "../../components/compare-mdx";
import { localizeLandingHref } from "@/lib/landing-nav-paths";
import { siteUrl } from "@/lib/site-url";
import { truncateForSocialDescription } from "@/lib/og/site-metadata";
import { LANDING_SECTION_CONTAINER_CLASSNAME } from "../../../components/landing-section-container";
import { getCompareCopy } from "../../compare-copy";
import { CompareCtas } from "../../components/compare-ctas";

type ParamsInput =
  | {
      slug: string;
      locale: string;
    }
  | Promise<{
      slug: string;
      locale: string;
    }>;

interface PageProps {
  params: ParamsInput;
}

export async function generateStaticParams() {
  const locales = getLocaleStaticParams().map((entry) => entry.locale);
  const paths: Array<{ locale: string; slug: string }> = [];

  for (const locale of locales) {
    const journals = await getLiveCompareMetadata(locale);
    paths.push(
      ...journals.map((journal) => ({
        locale,
        slug: journal.slug,
      })),
    );
  }

  return paths;
}

async function getCachedCompareMetadata(
  slug: string,
  locale: string,
): Promise<Metadata> {
  "use cache";
  cacheLife("max");

  setStaticParamsLocale(locale);

  const copy = getCompareCopy(locale);
  const journal = await getCompareJournalMetadata(slug, locale);
  if (!journal || journal.status !== "live") {
    return {
      title: "Not Found",
      description: "The page you are looking for does not exist.",
    };
  }

  const title = copy.oneToOne.title(journal.name);
  const description = truncateForSocialDescription(
    journal.lede || journal.oneLiner,
  );
  const url = siteUrl(`/${locale}/trading-journal/futures/${slug}`);

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: siteUrl(`/en/trading-journal/futures/${slug}`),
        fr: siteUrl(`/fr/trading-journal/futures/${slug}`),
      },
    },
    openGraph: {
      title,
      description,
      type: "article",
      url,
      siteName: "Deltalytix",
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  if (!resolvedParams?.slug || !resolvedParams.locale) {
    return {
      title: "Not Found",
      description: "The page you are looking for does not exist.",
    };
  }

  return getCachedCompareMetadata(resolvedParams.slug, resolvedParams.locale);
}

async function CachedComparePage({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}) {
  "use cache";
  cacheLife("max");

  setStaticParamsLocale(locale);

  const copy = getCompareCopy(locale);
  const metadata = await getCompareJournalMetadata(slug, locale);
  if (!metadata || metadata.status !== "live") {
    notFound();
  }

  const post = await getCompareJournal(
    slug,
    locale,
    compareMdxComponents(metadata.name),
  );
  if (!post) {
    notFound();
  }

  const title = copy.oneToOne.title(post.meta.name);
  const hubHref = localizeLandingHref(locale, "/trading-journal/futures");

  return (
    <main className="min-h-screen">
      <header>
        <div
          className={`${LANDING_SECTION_CONTAINER_CLASSNAME} py-16 sm:py-24 lg:py-28`}
        >
          <nav
            aria-label="Breadcrumb"
            className="mb-6 text-sm text-black/45 dark:text-white/45"
          >
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <li>
                <Link
                  href={localizeLandingHref(locale, "/trading-journal")}
                  className="transition-colors hover:text-foreground"
                >
                  {copy.oneToOne.breadcrumbJournal}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={hubHref}
                  className="transition-colors hover:text-foreground"
                >
                  {copy.oneToOne.breadcrumbFutures}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-black/55 dark:text-white/55">
                {post.meta.name}
              </li>
            </ol>
          </nav>
          <h1 className="max-w-[960px] text-balance text-[clamp(3rem,7.2vw,7.25rem)] font-normal leading-[1.12] tracking-[-0.06em] sm:leading-[1.06] md:leading-[1] lg:leading-[0.96]">
            {title}
          </h1>
          <p className="mt-7 max-w-[720px] text-pretty text-lg leading-relaxed text-black/60 dark:text-white/60 md:text-xl">
            {post.meta.lede}
          </p>
          <div className="mt-8">
            <CompareCtas
              locale={locale}
              placement={`compare_${post.slug}`}
            />
          </div>
        </div>
      </header>

      <section>
        <div
          className={`${LANDING_SECTION_CONTAINER_CLASSNAME} py-12 md:py-16`}
        >
          {post.content}
        </div>
      </section>

      <section className="border-t border-[#E5E5E5] dark:border-white/10">
        <div
          className={`${LANDING_SECTION_CONTAINER_CLASSNAME} py-16 sm:py-24`}
        >
          <h2 className="max-w-[900px] text-balance text-[clamp(2.5rem,6vw,5.5rem)] font-normal leading-[0.96] tracking-[-0.055em]">
            {copy.oneToOne.footerHeading}
          </h2>
          <p className="mt-5 max-w-[640px] text-pretty text-lg leading-relaxed text-foreground">
            {copy.oneToOne.footerLead}
          </p>
          <p className="mt-2 max-w-[640px] text-pretty text-sm leading-relaxed text-black/45 dark:text-white/45 md:text-base">
            {copy.oneToOne.footerLede}
          </p>
          <div className="mt-8">
            <CompareCtas
              locale={locale}
              placement={`compare_${post.slug}_footer`}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function ComparePage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  if (!resolvedParams?.slug || !resolvedParams.locale) {
    notFound();
  }

  return (
    <CachedComparePage
      slug={resolvedParams.slug}
      locale={resolvedParams.locale}
    />
  );
}
