'use client'

import React from 'react'
import Image from 'next/image'
import { Badge } from "@/components/ui/badge"
import { useI18n } from '@/locales/client'
import { TranslationKeys } from "@/types/translations"
import CompletedTimeline from '../components/completed-timeline'
import { Milestone } from '@/types/milestone'
import { roadmapData } from './data'

function RoadmapBlog() {
  const t = useI18n()

  const upcomingFeatures = roadmapData
    .filter(milestone => milestone.status === 'upcoming')
    .sort(sortByEstimatedDate)

  const inProgressFeatures = roadmapData.filter(milestone => milestone.status === 'in-progress')
  const completedFeatures = roadmapData.filter(milestone => milestone.status === 'completed')

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">{t('updates.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-12">
          {t('updates.description')}
        </p>

        <h2 className="text-2xl font-semibold mt-12 mb-6 text-gray-800 dark:text-gray-200">{t('updates.inProgress')}</h2>
        {inProgressFeatures.map((milestone) => (
          <MilestoneCard key={milestone.id} milestone={milestone} />
        ))}

        <h2 className="text-2xl font-semibold mt-12 mb-6 text-gray-800 dark:text-gray-200">{t('updates.upcoming')}</h2>
        {upcomingFeatures.map((milestone) => (
          <MilestoneCard key={milestone.id} milestone={milestone} />
        ))}

        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">{t('updates.completed')}</h2>
        <CompletedTimeline milestones={completedFeatures} />
      </div>
    </div>
  )
}

function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const t = useI18n()

  return (
    <div className="mb-16">
      <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
        {t(milestone.titleKey as keyof TranslationKeys)}
      </h3>
      <div className="flex items-center gap-2 mb-4">
        <Badge 
          variant={milestone.status === 'in-progress' ? "secondary" : "outline"}
          className="flex items-center"
        >
          {milestone.status === 'in-progress' && (
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          )}
          {milestone.status === 'in-progress' ? t('updates.statusInProgress') : t('updates.statusUpcoming')}
        </Badge>
        {milestone.estimatedDate && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t(milestone.estimatedDate as keyof TranslationKeys)}
          </span>
        )}
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {t(milestone.descriptionKey as keyof TranslationKeys)}
      </p>
      {milestone.image && (
        <div className="rounded-lg overflow-hidden mb-6 bg-gray-100 dark:bg-gray-800">
          <Image
            src={milestone.image}
            alt={`${t(milestone.titleKey as keyof TranslationKeys)} ${t('updates.preview')}`}
            width={800}
            height={400}
            className="w-full h-auto"
          />
        </div>
      )}
    </div>
  )
}

export default RoadmapBlog

function sortByEstimatedDate(a: Milestone, b: Milestone): number {
  const estimatedDateOrder: Record<string, number> = {
    'updates.inTwoWeeks': 1,
    'updates.inThreeWeeks': 2,
    'updates.inFourWeeks': 3,
    'updates.inFiveWeeks': 4,
  }

  if (!a.estimatedDate) return 1
  if (!b.estimatedDate) return -1

  const aOrder = estimatedDateOrder[a.estimatedDate] || Infinity
  const bOrder = estimatedDateOrder[b.estimatedDate] || Infinity

  return aOrder - bOrder
}
