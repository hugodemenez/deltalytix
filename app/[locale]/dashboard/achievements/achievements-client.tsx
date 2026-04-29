'use client'

import React from 'react'
import { useGamification } from '@/hooks/use-gamification'
import { ACHIEVEMENTS } from '@/lib/gamification/achievements'
import { AchievementCard } from '@/components/gamification/achievement-card'
import { XpBar } from '@/components/gamification/xp-bar'
import { StreakWidget } from '@/components/gamification/streak-widget'

const CATEGORIES = ['TRADING', 'RISK', 'CONSISTENCY', 'MILESTONE', 'SOCIAL'] as const

export function AchievementsPageClient() {
  const { stats, achievements, streak, isLoading } = useGamification()
  const earnedSet = new Set(achievements.map(a => a.achievementId))
  const earnedMap = new Map(achievements.map(a => [a.achievementId, a.earnedAt]))

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Profile summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        {stats && <XpBar xp={stats.xp} />}
        {streak && <StreakWidget current={streak.current} longest={streak.longest} />}
      </div>

      {/* Progress summary */}
      <p className="text-sm text-muted-foreground">
        {earnedSet.size} / {ACHIEVEMENTS.length} unlocked
      </p>

      {/* Achievements by category */}
      {CATEGORIES.map(cat => {
        const list = ACHIEVEMENTS.filter(a => a.category === cat)
        return (
          <section key={cat}>
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
              {cat.charAt(0) + cat.slice(1).toLowerCase()}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {list.map(ach => (
                <AchievementCard
                  key={ach.id}
                  achievement={ach}
                  earned={earnedSet.has(ach.id)}
                  earnedAt={earnedMap.get(ach.id)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
