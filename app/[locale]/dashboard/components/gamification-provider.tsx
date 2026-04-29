'use client'

import React, { useEffect } from 'react'
import { useGamificationStore } from '@/store/gamification-store'
import { ACHIEVEMENTS_MAP } from '@/lib/gamification/achievements'
import { AchievementToastConsumer } from '@/components/gamification/achievement-toast'
import { useGamification } from '@/hooks/use-gamification'

/**
 * Mount once inside the dashboard layout (after auth).
 * - Polls for unnotified achievements and enqueues toasts.
 * - Renders the toast consumer.
 */
export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { achievements } = useGamification()
  const { enqueue }      = useGamificationStore()

  // On mount, pop any server-side unnotified achievements
  useEffect(() => {
    if (achievements.length === 0) return
    // /api/gamification already marks them notified server-side on next write;
    // here we just show toasts for fresh ones (earnedAt within last 10 s)
    const cutoff = Date.now() - 10_000
    achievements.forEach(ua => {
      if (new Date(ua.earnedAt).getTime() >= cutoff) {
        const def = ACHIEVEMENTS_MAP.get(ua.achievementId)
        if (def) enqueue(def)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <AchievementToastConsumer />
      {children}
    </>
  )
}
