'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { useI18n, useCurrentLocale } from '@/locales/client'
import { TranslationKeys } from "@/app/[locale]/(landing)/types/translations"
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
}

export default function CompletedTimeline({ milestones }: { milestones: TimelineItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const observerRefs = useRef<(HTMLDivElement | null)[]>([])
  const t = useI18n()
  const locale = useCurrentLocale()
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
        {completedMilestones.map((milestone, index) => (
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
              {milestone.image && (
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

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}