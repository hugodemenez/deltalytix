import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getShared } from "@/server/shared"
import { SharedPageClient } from "./shared-page-client"
import { getRequestOrigin, siteUrl } from "@/lib/site-url"
import { headers } from "next/headers"
import { truncateForSocialDescription } from "@/lib/og/site-metadata"
import { CacheComponentsDynamicMarker } from "@/components/cache-components-dynamic-marker"
import { Skeleton } from "@/components/ui/skeleton"

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
    sharedData = await getShared(slug)
  } catch (error) {
    console.error("Error loading shared metadata:", error)
  }

  const title = sharedData?.params.title || "Shared Trading Performance"
  const description = truncateForSocialDescription(
    sharedData?.params.description ||
      "View this shared Deltalytix trading performance dashboard.",
  )
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

async function SharedPageContent({ params }: SharedPageProps) {
  const resolvedParams = await params
  const sharedData = await getShared(resolvedParams.slug)

  if (!sharedData) {
    notFound()
  }

  return <SharedPageClient params={resolvedParams} initialData={sharedData} />
}

function SharedPageFallback() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10" aria-busy="true">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-full max-w-xl" />
      <Skeleton className="h-72 w-full" />
    </div>
  )
}

export default function SharedPage({ params }: SharedPageProps) {
  return (
    <>
      <CacheComponentsDynamicMarker />
      <Suspense fallback={<SharedPageFallback />}>
        <SharedPageContent params={params} />
      </Suspense>
    </>
  )
}
