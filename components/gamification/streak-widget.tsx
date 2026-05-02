'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Flame } from 'lucide-react'

interface StreakWidgetProps {
  current:  number
  longest:  number
  compact?: boolean
  className?: string
}

export function StreakWidget({ current, longest, compact = false, className }: StreakWidgetProps) {
  const isHot = current >= 5

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Flame className={cn('h-4 w-4', isHot ? 'text-orange-500' : 'text-muted-foreground')} />
        <span className={cn('text-sm font-bold', isHot ? 'text-orange-500' : 'text-muted-foreground')}>
          {current}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-4 rounded-lg border p-3 bg-card', className)}>
      <div className={cn(
        'flex h-12 w-12 items-center justify-center rounded-full text-2xl',
        isHot ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-muted'
      )}>
        <Flame className={cn('h-6 w-6', isHot ? 'text-orange-500' : 'text-muted-foreground')} />
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className={cn('text-3xl font-bold', isHot ? 'text-orange-500' : 'text-foreground')}>
            {current}
          </span>
          <span className="text-sm text-muted-foreground">day streak</span>
        </div>
        <p className="text-xs text-muted-foreground">Best: {longest} days</p>
      </div>
    </div>
  )
}
