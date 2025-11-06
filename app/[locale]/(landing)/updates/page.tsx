import React from 'react'
import { getI18n } from '@/locales/server'
import CompletedTimeline from '../components/completed-timeline'
import { getAllPosts } from '@/lib/posts'
import { getLatestVideoFromPlaylist } from '@/app/[locale]/admin/actions/youtube'

interface PageProps {
  params: Promise<{
    locale: string
  }>
}

export default async function UpdatesPage(props: PageProps) {
  const params = await props.params;

  const {
    locale
  } = params;

  const t = await getI18n()
  const posts = await getAllPosts(locale)

  // Only show completed posts as per requirement
  const completedPosts = posts.filter(post => post.meta.status === 'completed')

  // Get the latest video for French locale
  let latestVideoId: string | null = null
  if (locale === 'fr') {
    latestVideoId = await getLatestVideoFromPlaylist()
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">{t('updates.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-12">
          {t('updates.description')}
        </p>

        {/* Display latest weekly video for French locale */}
        {locale === 'fr' && latestVideoId && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">
              {t('updates.weeklyVideo')}
            </h2>
            <div className="rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 shadow-lg">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${latestVideoId}`}
                  title="Dernière vidéo de la semaine"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}

        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">{t('updates.completed')}</h2>
        <CompletedTimeline milestones={completedPosts.map(post => ({
          id: post.meta.slug,
          title: post.meta.title,
          description: post.meta.description,
          status: 'completed',
          completedDate: post.meta.completedDate || post.meta.date,
          image: post.meta.image,
          youtubeVideoId: post.meta.youtubeVideoId
        }))} locale={locale} />
      </div>
    </div>
  )
}
