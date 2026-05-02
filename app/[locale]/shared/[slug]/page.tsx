import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getShared } from "@/server/shared"
import { SharedPageClient } from "./shared-page-client"
import { siteUrl } from "@/lib/site-url"

interface SharedPageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>
}

export async function generateMetadata({ params }: SharedPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const sharedData = await getShared(slug)
  const title = sharedData?.params.title || "Shared Trading Performance"
  const description =
    sharedData?.params.description ||
    "View this shared Deltalytix trading performance dashboard."
  const url = siteUrl(`/shared/${slug}`)

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
          url: siteUrl(`/${locale}/shared/${slug}/opengraph-image`),
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
      images: [siteUrl(`/${locale}/shared/${slug}/opengraph-image`)],
    },
  }
}

// Main page component - Server Component
export default async function SharedPage({ params }: SharedPageProps) {
  // Await the params Promise
  const resolvedParams = await params
  // Fetch shared data on the server
  const sharedData = await getShared(resolvedParams.slug)
  
  if (!sharedData) {
    notFound()
  }

  // Pass the resolved params and fetched data to the client component
  return <SharedPageClient params={resolvedParams} initialData={sharedData} />
}