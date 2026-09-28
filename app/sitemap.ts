import { MetadataRoute } from 'next'
import { getLiveCompareMetadata } from '@/lib/compare'
import {
  isExcludedFromSitemap,
  PUBLIC_SITEMAP_ROUTES,
  INDEXABLE_LOCALES,
  sitemapEntry,
} from '@/lib/seo-urls'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()
  const liveJournals = await getLiveCompareMetadata('en')

  const entries: MetadataRoute.Sitemap = []

  for (const route of PUBLIC_SITEMAP_ROUTES) {
    if (route.localized === false) {
      const entry = sitemapEntry(route.path, {
        localized: false,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        lastModified,
      })
      if (!isExcludedFromSitemap(new URL(entry.url).pathname)) {
        entries.push(entry)
      }
      continue
    }

    for (const locale of INDEXABLE_LOCALES) {
      const entry = sitemapEntry(route.path, {
        locale,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        lastModified,
      })
      if (!isExcludedFromSitemap(new URL(entry.url).pathname)) {
        entries.push(entry)
      }
    }
  }

  for (const journal of liveJournals) {
    const path = `/trading-journal/futures/${journal.slug}`
    for (const locale of INDEXABLE_LOCALES) {
      const entry = sitemapEntry(path, {
        locale,
        changeFrequency: 'monthly',
        priority: 0.7,
        lastModified,
      })
      if (!isExcludedFromSitemap(new URL(entry.url).pathname)) {
        entries.push(entry)
      }
    }
  }

  return entries
}
