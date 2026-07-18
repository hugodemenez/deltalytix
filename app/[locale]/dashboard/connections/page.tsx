import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
import { getConnectionsMetadataCopy } from '@/lib/og/site-metadata'
import { resolveLocale } from '@/lib/locale-params'
import { getSiteOrigin, siteUrl } from '@/lib/site-url'
import { getUserId } from '@/server/auth'
import { CachedConnectionsPage } from './components/cached-connections-page'
import { ConnectionsPageSkeleton } from './components/connections-page-skeleton'

type Locale = 'en' | 'fr'

/** Opt this route into Instant Navigations validation (Cache Components). */
export const instant = true

/**
 * Prefetch with the user session so warm `'use cache'` Connections UI can be
 * part of the instant navigation (not only the Suspense skeleton).
 */
export const prefetch = 'allow-runtime'

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

/**
 * Resolve auth outside `'use cache'`, then render the tagged cached page UI.
 * Cold cache → Suspense skeleton. Warm cache → cached UI included instantly.
 */
async function ConnectionsPageContent() {
  const userId = await getUserId()
  return <CachedConnectionsPage userId={userId} />
}

export default function ConnectionsPage() {
  return (
    <Suspense fallback={<ConnectionsPageSkeleton />}>
      <ConnectionsPageContent />
    </Suspense>
  )
}
