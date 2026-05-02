import type { Metadata } from "next"
import { cache } from "react"
import { notFound } from "next/navigation"
import { getShared } from "@/server/shared"
import { SharedPageClient } from "./shared-page-client"
import { getRequestOrigin, siteUrl } from "@/lib/site-url"
import { headers } from "next/headers"

const getCachedShared = cache(getShared)

interface SharedPageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>
}

export async function generateMetadata({ params }: SharedPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const requestHeaders = await headers()
  const origin = getRequestOrigin(requestHeaders)
  let sharedData: Awaited<ReturnType<typeof getShared>> = null

  try {
    sharedData = await getCachedShared(slug)
  } catch (error) {
    console.error("Error loading shared metadata:", error)
  }

  const title = sharedData?.params.title || "Shared Trading Performance"
  const description =
    sharedData?.params.description ||
    "View this shared Deltalytix trading performance dashboard."
  const url = siteUrl(`/${locale}/shared/${slug}`, origin)

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Deltalytix",
      type: "website",
      images: [
        {
          url: siteUrl(`/${locale}/shared/${slug}/opengraph-image`, origin),
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteUrl(`/${locale}/shared/${slug}/opengraph-image`, origin)],
    },
  }
}

export default async function SharedPage({ params }: SharedPageProps) {
  const resolvedParams = await params
  const sharedData = await getCachedShared(resolvedParams.slug)
  
  if (!sharedData) {
    notFound()
  }

  return <SharedPageClient params={resolvedParams} initialData={sharedData} />
}