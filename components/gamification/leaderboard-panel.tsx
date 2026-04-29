'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { levelTitle } from '@/lib/gamification/xp'
import { Trophy } from 'lucide-react'

interface LeaderboardEntry {
  rank:        number
  userId:      string
  xp:          number
  level:       number
  totalTrades: number
  winRate:     number
}

interface LeaderboardPanelProps {
  entries:    LeaderboardEntry[]
  currentUserId?: string
  className?: string
}

const RANK_MEDALS = ['🥇', '🥈', '🥉']

export function LeaderboardPanel({ entries, currentUserId, className }: LeaderboardPanelProps) {
  return (
    <div className={cn('rounded-lg border bg-card overflow-hidden', className)}>
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <Trophy className="h-4 w-4 text-amber-500" />
        <span className="font-semibold text-sm">Leaderboard</span>
      </div>
      <div className="divide-y">
        {entries.map(entry => (
          <div
            key={entry.userId}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/30',
              entry.userId === currentUserId && 'bg-primary/5 font-medium'
            )}
          >
            <span className="w-7 text-center text-base">
              {entry.rank <= 3 ? RANK_MEDALS[entry.rank - 1] : `#${entry.rank}`}
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">
                {entry.userId === currentUserId ? 'You' : `Trader #${entry.rank}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Lv.{entry.level} {levelTitle(entry.level)} · {entry.totalTrades} trades
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-primary">{entry.xp.toLocaleString()} XP</p>
              <p className="text-xs text-muted-foreground">{(entry.winRate * 100).toFixed(0)}% WR</p>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No data yet</p>
        )}
      </div>
    </div>
  )
}
