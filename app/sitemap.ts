import { MetadataRoute } from 'next'
import { getLiveCompareMetadata } from '@/lib/compare'
import { siteUrl } from '@/lib/site-url'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const liveJournals = await getLiveCompareMetadata('en')

  return [
    {
      url: siteUrl(),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: siteUrl('/about'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: siteUrl('/pricing'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: siteUrl('/updates'),
      lastModified: new Date(),
      changeFrequency: 'weekly', 
      priority: 0.7,
    },
    {
      url: siteUrl('/trading-journal/futures'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...liveJournals.map((journal) => ({
      url: siteUrl(`/trading-journal/futures/${journal.slug}`),
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    {
      url: siteUrl('/support'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: siteUrl('/authentication'),
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    {
      url: siteUrl('/privacy'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: siteUrl('/settings'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: siteUrl('/terms'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: siteUrl('/disclaimers'),
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: siteUrl('/propfirms'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: siteUrl('/teams'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    // Agent entry points: the docs index and the llms.txt site index.
    {
      url: siteUrl('/docs/api'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: siteUrl('/llms.txt'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    }
  ]
}
