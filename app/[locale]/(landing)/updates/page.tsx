import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from "@/components/ui/badge"
import { getI18n } from '@/locales/server'
import CompletedTimeline from '../components/completed-timeline'
import { getAllPosts } from '@/lib/posts'
import { Post } from '@/app/[locale]/(landing)/types/post'

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

  const upcomingPosts = posts
    .filter(post => post.meta.status === 'upcoming')
    .sort((a, b) => (a.meta.estimatedDate || '') > (b.meta.estimatedDate || '') ? 1 : -1)

  const inProgressPosts = posts.filter(post => post.meta.status === 'in-progress')
  const completedPosts = posts.filter(post => post.meta.status === 'completed')

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">{t('updates.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-12">
          {t('updates.description')}
        </p>

        <h2 className="text-2xl font-semibold mt-12 mb-6 text-gray-800 dark:text-gray-200">{t('updates.inProgress')}</h2>
        {inProgressPosts.map((post) => (
          <UpdateCard key={post.meta.slug} post={post} />
        ))}

        <h2 className="text-2xl font-semibold mt-12 mb-6 text-gray-800 dark:text-gray-200">{t('updates.upcoming')}</h2>
        {upcomingPosts.map((post) => (
          <UpdateCard key={post.meta.slug} post={post} />
        ))}

        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">{t('updates.completed')}</h2>
        <CompletedTimeline milestones={completedPosts.map(post => ({
          id: post.meta.slug,
          title: post.meta.title,
          description: post.meta.description,
          status: 'completed',
          completedDate: post.meta.completedDate || post.meta.date,
          image: post.meta.image
        }))} />
      </div>
    </div>
  )
}

function UpdateCard({ post }: { post: Post }) {
  const { meta } = post

  return (
    <Link href={`/updates/${meta.slug}`} className="block mb-16 hover:opacity-90 transition-opacity">
      <div>
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          {meta.title}
        </h3>
        <div className="flex items-center gap-2 mb-4">
          <Badge 
            variant={meta.status === 'in-progress' ? "secondary" : "outline"}
            className="flex items-center"
          >
            {meta.status === 'in-progress' && (
              <span className="relative flex h-3 w-3 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            )}
            {meta.status === 'in-progress' ? 'In Progress' : 'Upcoming'}
          </Badge>
          {meta.estimatedDate && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {meta.estimatedDate}
            </span>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {meta.description}
        </p>
        {meta.image && (
          <div className="rounded-lg overflow-hidden mb-6 bg-gray-100 dark:bg-gray-800">
            <Image
              src={meta.image}
              alt={`${meta.title} preview`}
              width={800}
              height={400}
              className="w-full h-auto"
            />
          </div>
        )}
      </div>
    </Link>
  )
}
