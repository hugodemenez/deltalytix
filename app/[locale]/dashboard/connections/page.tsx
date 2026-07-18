import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Suspense } from 'react'
import { getConnectionsMetadataCopy } from '@/lib/og/site-metadata'
import { getRequestOrigin, siteUrl } from '@/lib/site-url'
import { ConnectionsPageClient } from './components/connections-page-client'
import { ConnectionsPageSkeleton } from './components/connections-page-skeleton'
import { getConnectionsPageDataCached } from './data'

type Locale = 'en' | 'fr'

/** Opt this route into Instant Navigations validation (Cache Components). */
export const instant = true

export async function generateMetadata(props: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await props.params
  const copy = getConnectionsMetadataCopy(locale)
  const origin = getRequestOrigin(await headers())
  const imageUrl = siteUrl(`/${locale}/dashboard/connections/opengraph-image`, origin)

  return {
    title: {
      absolute: copy.title,
    },
    description: copy.description,
    openGraph: {
      title: copy.title,
      description: copy.description,
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: copy.ogAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.description,
      images: [imageUrl],
    },
  }
}

async function ConnectionsPageContent() {
  const initialData = await getConnectionsPageDataCached()
  return <ConnectionsPageClient initialData={initialData} />
}

/**
 * Return the shell immediately; stream connection data behind Suspense so
 * client navigations (e.g. navbar → Connections) feel instant.
 */
export default function ConnectionsPage() {
  return (
    <Suspense fallback={<ConnectionsPageSkeleton />}>
      <ConnectionsPageContent />
    </Suspense>
  )
}
