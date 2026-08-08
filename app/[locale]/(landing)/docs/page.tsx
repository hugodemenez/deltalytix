import Link from "next/link";
import { cacheLife } from "next/cache";
import { setStaticParamsLocale } from "next-international/server";
import { getI18n } from "@/locales/server";
import { getStaticParams as getLocaleStaticParams } from "@/locales/server";
import { getAllDocMetadata } from "@/lib/docs";
import { LANDING_SECTION_CONTAINER_CLASSNAME } from "../components/landing-section-container";
import type { Metadata } from "next";
import { siteUrl } from "@/lib/site-url";
import { truncateForSocialDescription } from "@/lib/og/site-metadata";

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

export function generateStaticParams() {
  return getLocaleStaticParams();
}

async function getCachedDocsIndexMetadata(locale: string): Promise<Metadata> {
  "use cache";
  cacheLife("hours");

  setStaticParamsLocale(locale);

  const t = await getI18n();
  const url = siteUrl(`/${locale}/docs`);
  const title = t("docs.title");
  const description = truncateForSocialDescription(t("docs.description"));

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: siteUrl("/en/docs"),
        fr: siteUrl("/fr/docs"),
      },
    },
    openGraph: {
      title: `${title} | Deltalytix`,
      description,
      type: "website",
      url,
      siteName: "Deltalytix",
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Deltalytix`,
      description,
    },
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return getCachedDocsIndexMetadata(locale);
}

async function CachedDocsPage({ locale }: { locale: string }) {
  "use cache";
  cacheLife("hours");

  setStaticParamsLocale(locale);

  const t = await getI18n();
  const docs = await getAllDocMetadata(locale);

  return (
    <main className="min-h-screen">
      <header className="border-b border-black/10 dark:border-white/10">
        <div
          className={`${LANDING_SECTION_CONTAINER_CLASSNAME} w-full py-16 sm:py-24 lg:py-32`}
        >
          <p className="mb-7 text-sm text-black/55 dark:text-white/55">
            Deltalytix
          </p>
          <h1 className="max-w-[960px] text-balance text-[clamp(3rem,7.2vw,7.25rem)] font-normal leading-[0.92] tracking-[-0.06em]">
            {t("docs.title")}
          </h1>
          <p className="mt-7 max-w-[680px] text-pretty text-lg leading-relaxed text-black/60 dark:text-white/60 md:text-xl">
            {t("docs.description")}
          </p>
        </div>
      </header>

      <section>
        <div
          className={`${LANDING_SECTION_CONTAINER_CLASSNAME} w-full py-12 sm:py-16`}
        >
          <div className="border-b border-black/10 pb-8 dark:border-white/10">
            <h2 className="text-sm font-medium text-black/55 dark:text-white/55">
              {t("docs.sections")}
            </h2>
          </div>

          <div>
            {docs.map((doc, index) => (
              <article
                key={doc.slug}
                className="border-b border-black/10 dark:border-white/10"
              >
                <Link
                  href={`/${locale}/docs/${doc.slug}`}
                  className="group grid gap-6 py-10 outline-hidden md:grid-cols-[minmax(180px,0.35fr)_minmax(0,1fr)] md:py-14"
                >
                  <div className="flex items-start justify-between gap-4 md:block">
                    <span className="text-sm text-black/50 dark:text-white/50">
                      {t("docs.sectionLabel", {
                        number: String(index + 1).padStart(2, "0"),
                      })}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-6">
                    <div className="max-w-3xl">
                      <h3 className="text-2xl font-normal leading-tight tracking-[-0.03em] text-balance transition-opacity group-hover:opacity-60 sm:text-3xl">
                        {doc.meta.title}
                      </h3>
                      <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-black/60 dark:text-white/60">
                        {doc.meta.description}
                      </p>
                    </div>
                    <span
                      className="mt-1 text-xl transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden
                    >
                      →
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function DocsPage(props: PageProps) {
  const { locale } = await props.params;
  return <CachedDocsPage locale={locale} />;
}
