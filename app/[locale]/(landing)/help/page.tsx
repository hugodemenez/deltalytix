import type { Metadata } from "next"
import Link from "next/link"
import { cacheLife } from "next/cache"
import { setStaticParamsLocale } from "next-international/server"
import { getI18n } from "@/locales/server"
import { getStaticParams as getLocaleStaticParams } from "@/locales/server"
import { LANDING_SECTION_CONTAINER_CLASSNAME } from "../components/landing-section-container"
import { siteUrl } from "@/lib/site-url"
import { truncateForSocialDescription } from "@/lib/og/site-metadata"

interface PageProps {
  params: Promise<{
    locale: string
  }>
}

export function generateStaticParams() {
  return getLocaleStaticParams()
}

async function getCachedHelpMetadata(locale: string): Promise<Metadata> {
  "use cache"
  cacheLife("hours")

  setStaticParamsLocale(locale)

  const t = await getI18n()
  const url = siteUrl(`/${locale}/help`)
  const title = t("help.title")
  const description = truncateForSocialDescription(t("help.description"))

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: siteUrl("/en/help"),
        fr: siteUrl("/fr/help"),
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
  return getCachedHelpMetadata(locale)
}

export default async function HelpPage({ params }: PageProps) {
  const { locale } = await params
  setStaticParamsLocale(locale)
  const t = await getI18n()

  const topics = [
    {
      href: `/${locale}/#data-import`,
      title: t("help.topics.import.title"),
      description: t("help.topics.import.description"),
    },
    {
      href: `/${locale}/#daily-performance`,
      title: t("help.topics.calendar.title"),
      description: t("help.topics.calendar.description"),
    },
    {
      href: `/${locale}/#performance-visualization`,
      title: t("help.topics.charts.title"),
      description: t("help.topics.charts.description"),
    },
    {
      href: `/${locale}/#ai-journaling`,
      title: t("help.topics.journal.title"),
      description: t("help.topics.journal.description"),
    },
    {
      href: `/${locale}/dashboard`,
      title: t("help.topics.dashboard.title"),
      description: t("help.topics.dashboard.description"),
    },
    {
      href: `/${locale}/support`,
      title: t("help.topics.support.title"),
      description: t("help.topics.support.description"),
    },
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
            {t("help.title")}
          </h1>
          <p className="mt-5 max-w-[680px] text-pretty text-base leading-relaxed text-black/60 dark:text-white/60 sm:text-lg">
            {t("help.description")}
          </p>
          <p className="mt-4 max-w-[680px] text-pretty text-sm leading-relaxed text-black/55 dark:text-white/55">
            {t("help.intro")}{" "}
            <Link
              href={`/${locale}/docs`}
              className="underline-offset-4 transition-colors hover:text-black hover:underline dark:hover:text-white"
            >
              {t("help.apiCta")}
            </Link>
          </p>
        </div>
      </header>

      <section
        className={`${LANDING_SECTION_CONTAINER_CLASSNAME} w-full py-12 sm:py-16`}
      >
        <ul className="grid gap-4 sm:grid-cols-2">
          {topics.map((topic) => (
            <li key={topic.href}>
              <Link
                href={topic.href}
                className="block h-full rounded-xl border border-black/10 p-5 transition-colors hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.04]"
              >
                <h2 className="text-lg font-normal tracking-[-0.02em]">
                  {topic.title}
                </h2>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-black/55 dark:text-white/55">
                  {topic.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
