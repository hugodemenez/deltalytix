'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { levelFromXP, levelProgress, xpToNextLevel, levelTitle, xpForLevel } from '@/lib/gamification/xp'

interface XpBarProps {
  xp:        number
  className?: string
  compact?:   boolean
}

export function XpBar({ xp, className, compact = false }: XpBarProps) {
  const level    = levelFromXP(xp)
  const progress = levelProgress(xp)           // 0..1
  const toNext   = xpToNextLevel(xp)
  const title    = levelTitle(level)

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className="text-xs font-bold text-primary whitespace-nowrap">Lv.{level}</span>
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{toNext} XP</span>
      </div>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          Level {level} <span className="text-muted-foreground font-normal text-xs">— {title}</span>
        </span>
        <span className="text-muted-foreground text-xs">{xp.toLocaleString()} XP total</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground text-right">
        {toNext.toLocaleString()} XP to Level {level + 1}
      </div>
    </div>
  )
}
