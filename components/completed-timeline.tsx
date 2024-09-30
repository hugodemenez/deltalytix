'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"

type Milestone = {
  id: number
  title: string
  description: string
  completedDate?: string
}

export default function CompletedTimeline({ milestones }: { milestones: Milestone[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const observerRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observers = observerRefs.current.map((ref, index) => {
      if (ref) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              // Set only the current index as active
              setActiveIndex(index)
            } else if (activeIndex === index) {
              // If the current active item is no longer intersecting, set no active item
              setActiveIndex(null)
            }
          },
          { threshold: 0.9 } // Trigger when 90% of the element is visible
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

  // Sort milestones by completedDate, most recent first
  const sortedMilestones = [...milestones].sort((a, b) => {
    if (!a.completedDate || !b.completedDate) return 0
    return new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime()
  })

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-700" />
      {sortedMilestones.map((milestone, index) => (
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
              {new Date(milestone.completedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Badge>
          )}
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">{milestone.title}</h2>
          <p className="text-gray-600 dark:text-gray-400">{milestone.description}</p>
        </motion.div>
      ))}
    </div>
  )
}