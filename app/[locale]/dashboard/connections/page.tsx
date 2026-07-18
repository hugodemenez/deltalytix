import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getConnectionsMetadataCopy } from '@/lib/og/site-metadata'
import { ConnectionsPageClient } from './components/connections-page-client'
import { getConnectionsPageDataCached } from './data'

type Locale = 'en' | 'fr'

export async function generateMetadata(props: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await props.params
  const copy = getConnectionsMetadataCopy(locale)

  return {
    title: {
      absolute: copy.title,
    },
    description: copy.description,
    openGraph: {
      title: copy.title,
      description: copy.description,
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.description,
    },
  }
}

export default async function ConnectionsPage() {
  const initialData = await getConnectionsPageDataCached()

  return (
    <Suspense fallback={null}>
      <ConnectionsPageClient initialData={initialData} />
    </Suspense>
  )
}
