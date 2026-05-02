'use client'

import React, { useEffect } from 'react'
import { useGamificationStore } from '@/store/gamification-store'
import { RARITY_COLOR } from '@/lib/gamification/achievements'
import { toast } from 'sonner'

/**
 * Mount this once in the layout.
 * It drains the pendingToasts queue and fires a Sonner toast per achievement.
 */
export function AchievementToastConsumer() {
  const { pendingToasts, dequeue } = useGamificationStore()

  useEffect(() => {
    if (pendingToasts.length === 0) return
    const ach = dequeue()
    if (!ach) return

    toast.custom(
      () => (
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg bg-background ${RARITY_COLOR[ach.rarity]}`}>
          <span className="text-2xl">{ach.icon}</span>
          <div>
            <p className="font-semibold text-sm">Achievement unlocked!</p>
            <p className="text-xs font-bold">{ach.title}</p>
            <p className="text-[10px] text-muted-foreground">{ach.description} · +{ach.xp} XP</p>
          </div>
        </div>
      ),
      { duration: 5000, position: 'bottom-right' }
    )
  }, [pendingToasts, dequeue])

  return null
}
