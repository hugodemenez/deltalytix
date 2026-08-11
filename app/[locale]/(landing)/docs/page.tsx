import type { Metadata } from "next"
import Link from "next/link"
import { cacheLife } from "next/cache"
import { setStaticParamsLocale } from "next-international/server"
import { getI18n } from "@/locales/server"
import { getStaticParams as getLocaleStaticParams } from "@/locales/server"
import { getAllDocs } from "@/lib/docs"
import { LANDING_SECTION_CONTAINER_CLASSNAME } from "../components/landing-section-container"
import { DocsPageShell } from "@/components/docs/docs-page-shell"
import type { DocsNavItem } from "@/components/docs/docs-section-nav"
import { DocsApiPlayground } from "@/components/docs/api-playground"
import { DocsOpenApiReference } from "@/components/docs/openapi-reference"
import { siteUrl } from "@/lib/site-url"
import { truncateForSocialDescription } from "@/lib/og/site-metadata"

interface PageProps {
  params: Promise<{
    locale: string
  }>
}

const DOCS_PROSE_CLASSNAME = `prose prose-neutral dark:prose-invert max-w-none
  prose-headings:tracking-tight prose-headings:font-normal
  prose-pre:p-0 prose-pre:bg-transparent
  prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-neutral-100 prose-code:text-neutral-800
  dark:prose-code:bg-neutral-800 dark:prose-code:text-neutral-200
  prose-table:my-0 prose-table:w-max prose-table:min-w-full
  [&_.mdx-table-scroll]:my-6`

export function generateStaticParams() {
  return getLocaleStaticParams()
}

async function getCachedDocsIndexMetadata(locale: string): Promise<Metadata> {
  "use cache"
  cacheLife("hours")

  setStaticParamsLocale(locale)

  const t = await getI18n()
  const url = siteUrl(`/${locale}/docs`)
  const title = t("docs.title")
  const description = truncateForSocialDescription(t("docs.description"))

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
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  return getCachedDocsIndexMetadata(locale)
}

/**
 * Cache the static docs shell + MDX. The playground / OpenAPI panels are
 * client components that call server actions and fetch `/openapi.json` at
 * runtime, so they do not need this page to be request-time dynamic.
 * Without `"use cache"`, Cache Components prerender fails on unstable
 * `Date.now()` in the landing tree (Vercel production build).
 */
async function CachedDocsPage({ locale }: { locale: string }) {
  "use cache"
  cacheLife("hours")

  setStaticParamsLocale(locale)

  const t = await getI18n()
  const docs = await getAllDocs(locale)

  const navItems: DocsNavItem[] = [
    { id: "try-it", title: t("docs.tryIt") },
    ...docs.map((doc) => ({
      id: doc.slug,
      title: doc.meta.title,
    })),
    { id: "openapi", title: t("docs.openApi") },
  ]

  return (
    <main className="min-h-screen">
      <header className="border-b border-black/10 dark:border-white/10">
        <div
          className={`${LANDING_SECTION_CONTAINER_CLASSNAME} w-full py-10 sm:py-14 lg:py-16`}
        >
          <p className="mb-4 text-sm text-black/55 dark:text-white/55">
            Deltalytix
          </p>
          <h1 className="max-w-[960px] text-balance text-[clamp(2.25rem,5vw,4.5rem)] font-normal leading-[0.95] tracking-[-0.06em]">
            {t("docs.title")}
          </h1>
          <p className="mt-5 max-w-[680px] text-pretty text-base leading-relaxed text-black/60 dark:text-white/60 sm:text-lg">
            {t("docs.description")}
          </p>
          <p className="mt-6">
            <Link
              href="/openapi.json"
              className="text-sm text-black/55 underline-offset-4 transition-colors hover:text-black hover:underline dark:text-white/55 dark:hover:text-white"
            >
              {t("docs.openApiJson")}
            </Link>
          </p>
        </div>
      </header>

      <DocsPageShell
        navItems={navItems}
        navLabel={t("docs.onThisPage")}
        jumpLabel={t("docs.jumpToSection")}
      >
        <section
          id="try-it"
          className="scroll-mt-24 border-b border-black/10 pb-12 dark:border-white/10 sm:pb-16"
        >
          <h2 className="text-balance text-2xl font-normal tracking-[-0.03em] sm:text-3xl">
            {t("docs.tryIt")}
          </h2>
          <div className="mt-6">
            <DocsApiPlayground />
          </div>
        </section>

        {docs.map((doc) => (
          <section
            key={doc.slug}
            id={doc.slug}
            className="scroll-mt-24 border-b border-black/10 py-12 dark:border-white/10 sm:py-16"
          >
            <h2 className="text-balance text-2xl font-normal tracking-[-0.03em] sm:text-3xl">
              {doc.meta.title}
            </h2>
            {doc.meta.description ? (
              <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-black/60 dark:text-white/60">
                {doc.meta.description}
              </p>
            ) : null}
            <div className={`mt-8 ${DOCS_PROSE_CLASSNAME}`}>{doc.content}</div>
          </section>
        ))}

        <section id="openapi" className="scroll-mt-24 py-12 sm:py-16">
          <h2 className="text-balance text-2xl font-normal tracking-[-0.03em] sm:text-3xl">
            {t("docs.openApi")}
          </h2>
          <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-black/60 dark:text-white/60">
            <Link
              href="/openapi.json"
              className="underline-offset-4 hover:underline"
            >
              {t("docs.openApiJson")}
            </Link>
          </p>
          <div className="mt-6">
            <DocsOpenApiReference />
          </div>
        </section>
      </DocsPageShell>
    </main>
  )
}

export default async function DocsPage(props: PageProps) {
  const { locale } = await props.params
  return <CachedDocsPage locale={locale} />
}
