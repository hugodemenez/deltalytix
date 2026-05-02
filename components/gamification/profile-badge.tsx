'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { XpBar } from './xp-bar'
import { StreakWidget } from './streak-widget'
import { levelTitle, levelFromXP } from '@/lib/gamification/xp'
import { useGamification } from '@/hooks/use-gamification'

interface ProfileBadgeProps {
  className?: string
}

export function ProfileBadge({ className }: ProfileBadgeProps) {
  const { stats, streak, isLoading } = useGamification()

  if (isLoading || !stats) return null

  const level = levelFromXP(stats.xp)

  return (
    <div className={cn('flex flex-col gap-2 p-3 rounded-lg border bg-card', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Your level</p>
          <p className="text-lg font-bold text-primary">Level {level}</p>
          <p className="text-xs text-muted-foreground">{levelTitle(level)}</p>
        </div>
        {streak && (
          <StreakWidget current={streak.current} longest={streak.longest} compact />
        )}
      </div>
      <XpBar xp={stats.xp} compact />
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { label: 'Trades', value: stats.totalTrades },
          { label: 'Win Rate', value: `${(stats.winRate * 100).toFixed(0)}%` },
          { label: 'Avg R:R', value: stats.avgRR.toFixed(2) },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-sm font-bold">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
