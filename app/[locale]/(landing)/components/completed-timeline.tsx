'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'

interface TimelineItem {
  id: string
  title: string
  description: string
  completedDate: string
  status: 'completed' | 'in-progress' | 'upcoming'
  image?: string
  youtubeVideoId?: string
}

export default function CompletedTimeline({ milestones, locale }: { milestones: TimelineItem[], locale: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const observerRefs = useRef<(HTMLDivElement | null)[]>([])
  const dateLocale = locale === 'fr' ? fr : enUS

  useEffect(() => {
    const observers = observerRefs.current.map((ref, index) => {
      if (ref) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setActiveIndex(index)
            } else if (activeIndex === index) {
              setActiveIndex(null)
            }
          },
          { threshold: 0.9 }
        )
        observer.observe(ref)
        return observer
      }
      return null
    })

    return () => {
      observers.forEach(observer => observer?.disconnect())
    }
  }, [milestones.length, activeIndex])

  // Filter and sort completed milestones by completedDate, most recent first
  const completedMilestones = milestones
    .filter(milestone => milestone.status === 'completed' && milestone.completedDate)
    .sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime())

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 h-full w-0.5 bg-neutral-200 dark:bg-neutral-800" />
      
      <div className="space-y-12 pl-12">
        {completedMilestones.map((milestone) => (
          <div key={milestone.id} className="relative">
            <div className="absolute -left-[44px] flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="h-3 w-3 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>
            
            <Link href={`/updates/${milestone.id}`} className="block hover:opacity-90 transition-opacity">
              <time className="mb-2 block text-sm text-neutral-600 dark:text-neutral-400">
                {format(new Date(milestone.completedDate), 'MMMM d, yyyy', { locale: dateLocale })}
              </time>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {milestone.title}
              </h3>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                {milestone.description}
              </p>
              
              {/* Display YouTube video for French locale if available */}
              {locale === 'fr' && milestone.youtubeVideoId && (
                <div className="mt-4 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      className="absolute top-0 left-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${milestone.youtubeVideoId}`}
                      title={milestone.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
              
              {milestone.image && !milestone.youtubeVideoId && (
                <div className="mt-4 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  <Image
                    src={milestone.image}
                    alt={milestone.title}
                    width={800}
                    height={400}
                    className="w-full h-auto"
                  />
                </div>
              )}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}