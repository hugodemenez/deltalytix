'use client'

import React, { useEffect } from 'react'
import { useGamificationStore } from '@/store/gamification-store'
import { ACHIEVEMENTS_MAP } from '@/lib/gamification/achievements'
import { AchievementToastConsumer } from '@/components/gamification/achievement-toast'

/**
 * Mount once inside the dashboard layout (after auth).
 * On mount, calls POST /api/gamification to pop unnotified achievements
 * (server marks them notified) and enqueues Sonner toasts.
 */
export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { enqueue } = useGamificationStore()

  useEffect(() => {
    fetch('/api/gamification', { method: 'POST' })
      .then(r => r.json())
      .then(({ achievements }) => {
        if (!Array.isArray(achievements)) return
        achievements.forEach((ach: { id: string }) => {
          const def = ACHIEVEMENTS_MAP.get(ach.id)
          if (def) enqueue(def)
        })
      })
      .catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <AchievementToastConsumer />
      {children}
    </>
  )
}
