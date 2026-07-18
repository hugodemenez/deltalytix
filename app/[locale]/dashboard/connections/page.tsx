import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { getConnectionsMetadataCopy } from '@/lib/og/site-metadata'
import { resolveLocale } from '@/lib/locale-params'
import { getSiteOrigin, siteUrl } from '@/lib/site-url'
import { ConnectionsPageClient } from './components/connections-page-client'
import { ConnectionsPageSkeleton } from './components/connections-page-skeleton'
import { getConnectionsPageDataCached } from './data'

type Locale = 'en' | 'fr'

/** Opt this route into Instant Navigations validation (Cache Components). */
export const instant = true

async function getCachedConnectionsMetadata(locale: Locale): Promise<Metadata> {
  'use cache'
  cacheLife('max')

  const copy = getConnectionsMetadataCopy(locale)
  const origin = getSiteOrigin()
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

export async function generateMetadata(props: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  // Await params outside `"use cache"` — request-bound promises inside a cache
  // scope hang prerender ("Filling a cache during prerender timed out").
  const locale = (await resolveLocale(props.params)) as Locale
  return getCachedConnectionsMetadata(locale)
}

async function ConnectionsPageContent() {
  // Request-time auth/DB — keep out of the prerender shell.
  await connection()
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
