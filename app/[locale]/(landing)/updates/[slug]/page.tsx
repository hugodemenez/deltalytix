import { getPost } from '@/lib/mdx'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getAllPosts } from '@/lib/mdx'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { format } from 'date-fns'
import Script from 'next/script'

interface PageProps {
  params: Promise<{
    slug: string
    locale: string
  }>
}

// Force page to be statically generated
export const dynamic = 'force-static'
export const dynamicParams = false // Don't generate pages for non-existent slugs

// Generate static paths for all posts in all locales
export async function generateStaticParams() {
  const locales = ['en', 'fr']
  const paths: Array<{ locale: string; slug: string }> = []

  for (const locale of locales) {
    const posts = await getAllPosts(locale)
    paths.push(...posts.map((post) => ({
      locale,
      slug: post.slug,
    })))
  }

  return paths
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const resolvedParams = await params
    if (!resolvedParams || !resolvedParams.slug || !resolvedParams.locale) {
      return {
        title: 'Not Found',
        description: 'The page you are looking for does not exist.',
      }
    }

    const { slug, locale } = resolvedParams
    
    try {
      const post = await getPost(slug, locale)
      if (!post) return {
        title: 'Not Found',
        description: 'The page you are looking for does not exist.',
      }
      const { meta } = post

      const ogImage = meta.image || '/og-image.png' // Fallback OG image
      const url = `https://delatlytix.com/${locale}/updates/${slug}`

      return {
        title: meta.title,
        description: meta.description,
        alternates: {
          canonical: url,
          languages: {
            'en': `https://delatlytix.com/en/updates/${slug}`,
            'fr': `https://delatlytix.com/fr/updates/${slug}`,
          },
        },
        openGraph: {
          title: meta.title,
          description: meta.description,
          type: 'article',
          publishedTime: meta.date,
          modifiedTime: meta.updatedAt || meta.date,
          url,
          siteName: 'Delatlytix',
          locale: locale,
          images: [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: meta.title,
            },
          ],
        },
        twitter: {
          card: 'summary_large_image',
          title: meta.title,
          description: meta.description,
          images: [ogImage],
        },
      }
    } catch (postError) {
      console.error('Error fetching post:', postError);
      return {
        title: 'Not Found',
        description: 'The page you are looking for does not exist.',
      }
    }
  } catch (paramError) {
    console.error('Error resolving params:', paramError);
    return {
      title: 'Not Found',
      description: 'The page you are looking for does not exist.',
    }
  }
}

export default async function Page({ params }: PageProps) {
  try {
    const resolvedParams = await params
    if (!resolvedParams || !resolvedParams.slug || !resolvedParams.locale) {
      notFound()
    }

    const { slug, locale } = resolvedParams
    
    try {
      const post = await getPost(slug, locale)

      if (!post) {
        notFound()
      }

      const { meta, content } = post
      const formattedDate = format(new Date(meta.date), 'MMMM d, yyyy')
      const url = `https://delatlytix.com/${locale}/updates/${slug}`

      // Prepare JSON-LD structured data
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: meta.title,
        description: meta.description,
        image: meta.image || '/og-image.png',
        datePublished: meta.date,
        dateModified: meta.updatedAt || meta.date,
        author: {
          '@type': 'Organization',
          name: 'Delatlytix',
          url: 'https://delatlytix.com'
        },
        publisher: {
          '@type': 'Organization',
          name: 'Delatlytix',
          logo: {
            '@type': 'ImageObject',
            url: 'https://delatlytix.com/logo.png'
          }
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': url
        }
      }

      return (
        <>
          <Script id="json-ld" type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </Script>

          <article className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8" itemScope itemType="https://schema.org/Article">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4 text-neutral-900 dark:text-neutral-100" itemProp="headline">
                {meta.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                <time dateTime={meta.date} itemProp="datePublished">
                  {formattedDate}
                </time>
                <Badge 
                  variant={meta.status === 'in-progress' ? "secondary" : 
                    meta.status === 'completed' ? "default" : "outline"}
                >
                  {meta.status === 'in-progress' ? 'In Progress' : 
                    meta.status === 'completed' ? 'Completed' : 'Upcoming'}
                </Badge>
              </div>
            </div>

            {meta.image && (
              <div className="mb-8 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <Image
                  src={meta.image}
                  alt={meta.title}
                  width={1200}
                  height={600}
                  className="w-full h-auto"
                  priority
                  itemProp="image"
                />
              </div>
            )}

            <div className="prose prose-neutral dark:prose-invert max-w-none 
              prose-pre:p-0 prose-pre:bg-transparent 
              prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-neutral-100 prose-code:text-neutral-800 
              dark:prose-code:bg-neutral-800 dark:prose-code:text-neutral-200
              prose-table:w-full prose-table:mt-6 prose-table:mb-8
              prose-thead:border-b prose-thead:border-neutral-200 dark:prose-thead:border-neutral-800
              prose-th:px-6 prose-th:py-3 prose-th:text-left prose-th:font-semibold
              prose-td:px-6 prose-td:py-3 prose-td:border-b prose-td:border-neutral-200 dark:prose-td:border-neutral-800
              prose-tr:transition-colors hover:prose-tr:bg-neutral-50 dark:hover:prose-tr:bg-neutral-900/30"
              itemProp="articleBody"
            >
              {content}
            </div>
          </article>
        </>
      )
    } catch (postError) {
      console.error('Error fetching post data:', postError);
      notFound()
    }
  } catch (paramError) {
    console.error('Error resolving params:', paramError);
    notFound()
  }
} 