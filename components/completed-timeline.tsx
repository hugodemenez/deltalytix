'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { useI18n } from '@/locales/client'

type Milestone = {
  id: number
  titleKey: string
  descriptionKey: string
  image?: string
  status: 'completed' | 'in-progress' | 'upcoming'
  estimatedDate?: string
  completedDate?: string
}

export default function CompletedTimeline({ milestones }: { milestones: Milestone[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const observerRefs = useRef<(HTMLDivElement | null)[]>([])
  const t = useI18n()

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
    .sort((a, b) => new Date(b.completedDate!).getTime() - new Date(a.completedDate!).getTime())

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-700" />
      {completedMilestones.map((milestone, index) => (
        <motion.div
          key={milestone.id}
          ref={(el: HTMLDivElement | null) => {
            observerRefs.current[index] = el
          }}
          className="milestone relative pl-12 pb-16"
          initial={{ opacity: 0.5, y: 20, scale: 1 }}
          animate={{ 
            opacity: activeIndex === index ? 1 : 0.5, 
            y: activeIndex === index ? 0 : 20,
            scale: activeIndex === index ? 1.05 : 1
          }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="absolute left-4 w-4 h-4 rounded-full bg-primary border-4 border-white dark:border-gray-900 transform -translate-x-1/2"
            initial={{ scale: 1 }}
            animate={{ scale: activeIndex === index ? 1.5 : 1 }}
            transition={{ duration: 0.3 }}
          />
          {milestone.completedDate && (
            <Badge variant="outline" className="mb-2">
              {formatDate(milestone.completedDate)}
            </Badge>
          )}
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
            {t(milestone.titleKey)}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t(milestone.descriptionKey)}
          </p>
          {milestone.image && (
            <img 
              src={milestone.image} 
              alt={t(milestone.titleKey)} 
              className="mt-4 rounded-lg shadow-md max-w-full h-auto"
            />
          )}
        </motion.div>
      ))}
    </div>
  )
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}