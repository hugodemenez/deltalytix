import type { Metadata } from "next"
import { permanentRedirect, notFound } from "next/navigation"
import { getStaticParams as getLocaleStaticParams } from "@/locales/server"
import { getAllDocMetadata, getDocMetadata } from "@/lib/docs"
import { siteUrl } from "@/lib/site-url"
import { truncateForSocialDescription } from "@/lib/og/site-metadata"

type ParamsInput =
  | {
      slug: string
      locale: string
    }
  | Promise<{
      slug: string
      locale: string
    }>

interface PageProps {
  params: ParamsInput
}

export async function generateStaticParams() {
  const locales = getLocaleStaticParams().map((entry) => entry.locale)
  const paths: Array<{ locale: string; slug: string }> = []

  for (const locale of locales) {
    const docs = await getAllDocMetadata(locale)
    paths.push(
      ...docs.map((doc) => ({
        locale,
        slug: doc.slug,
      })),
    )
  }

  return paths
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolved = await Promise.resolve(params)
  if (!resolved?.slug || !resolved?.locale) {
    return { title: "Not Found" }
  }

  const { slug, locale } = resolved
  const doc = await getDocMetadata(slug, locale)
  const url = siteUrl(`/${locale}/docs#${slug}`)

  if (!doc) {
    return {
      title: "Not Found",
      description: "The page you are looking for does not exist.",
    }
  }

  const description = truncateForSocialDescription(doc.meta.description)

  return {
    title: doc.meta.title,
    description,
    alternates: {
      canonical: siteUrl(`/${locale}/docs`),
      languages: {
        en: siteUrl("/en/docs"),
        fr: siteUrl("/fr/docs"),
      },
    },
    openGraph: {
      title: `${doc.meta.title} | Deltalytix`,
      description,
      type: "article",
      url,
      siteName: "Deltalytix",
      locale,
    },
  }
}

/**
 * Legacy per-slug docs URLs permanently redirect to the single-page anchor.
 */
export default async function Page({ params }: PageProps) {
  const resolved = await Promise.resolve(params)
  if (!resolved?.slug || !resolved?.locale) {
    notFound()
  }

  const { slug, locale } = resolved
  const doc = await getDocMetadata(slug, locale)
  if (!doc) {
    notFound()
  }

  permanentRedirect(`/${locale}/docs#${slug}`)
}
