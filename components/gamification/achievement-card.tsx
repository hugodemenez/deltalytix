'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { AchievementDef } from '@/lib/gamification/achievements'
import { RARITY_COLOR, RARITY_LABEL } from '@/lib/gamification/achievements'

interface AchievementCardProps {
  achievement: AchievementDef
  earned?:     boolean
  earnedAt?:   string
  className?:  string
}

export function AchievementCard({ achievement, earned = false, earnedAt, className }: AchievementCardProps) {
  const colors = RARITY_COLOR[achievement.rarity]

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 rounded-lg border p-3 transition-all',
        colors,
        !earned && 'opacity-40 grayscale',
        className
      )}
    >
      <span className="text-2xl select-none" aria-hidden>{achievement.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{achievement.title}</span>
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', colors)}>
            {RARITY_LABEL[achievement.rarity]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{achievement.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-bold text-primary">+{achievement.xp} XP</span>
          {earnedAt && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(earnedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      {earned && (
        <div className="absolute top-2 right-2 text-base" aria-label="Unlocked">✅</div>
      )}
    </div>
  )
}
