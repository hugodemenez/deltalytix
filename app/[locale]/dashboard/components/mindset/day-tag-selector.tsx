'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/locales/client'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from '@/components/ui/badge'
import { Trade } from '@prisma/client'
import { useUserStore } from '@/store/user-store'
import { format } from 'date-fns'

interface DayTagSelectorProps {
  trades: Trade[]
  date: Date
  onApplyTagToAll: (tag: string) => Promise<void>
}

export function DayTagSelector({ trades, date, onApplyTagToAll }: DayTagSelectorProps) {
  const t = useI18n()
  const tags = useUserStore(state => state.tags)
  const [isApplying, setIsApplying] = useState<string | null>(null)

  // Get trades for the selected date
  const tradesForDay = useMemo(() => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return trades.filter(trade => {
      const entryDate = trade.entryDate
      const closeDate = trade.closeDate
      return entryDate === dateKey || closeDate === dateKey
    })
  }, [trades, date])

  // Calculate tag statistics
  const tagStats = useMemo(() => {
    const stats = new Map<string, { count: number, totalTrades: number }>()
    
    tradesForDay.forEach(trade => {
      trade.tags.forEach(tag => {
        const current = stats.get(tag) || { count: 0, totalTrades: tradesForDay.length }
        stats.set(tag, { count: current.count + 1, totalTrades: tradesForDay.length })
      })
    })
    
    return Array.from(stats.entries()).map(([tag, data]) => ({
      tag,
      count: data.count,
      totalTrades: data.totalTrades,
      isComplete: data.count === data.totalTrades
    }))
  }, [tradesForDay])

  const handleApplyToAll = async (tag: string) => {
    setIsApplying(tag)
    try {
      await onApplyTagToAll(tag)
    } finally {
      setIsApplying(null)
    }
  }

  // Get tag metadata (color, description)
  const getTagMetadata = (tagName: string) => {
    return tags.find(t => t.name.toLowerCase() === tagName.toLowerCase())
  }

  if (tradesForDay.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">{t('mindset.tags.title')}</label>
        </div>
        <p className="text-xs text-muted-foreground">{t('mindset.tags.noTrades')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{t('mindset.tags.title')}</label>
        <span className="text-xs text-muted-foreground">
          {tradesForDay.length} {tradesForDay.length === 1 ? t('mindset.tags.trade') : t('mindset.tags.trades')}
        </span>
      </div>
      
      {tagStats.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('mindset.tags.noTagsOnTrades')}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tagStats.map(({ tag, count, totalTrades, isComplete }) => {
            const metadata = getTagMetadata(tag)
            return (
              <TooltipProvider key={tag}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "cursor-pointer transition-all hover:scale-105",
                        isComplete && "opacity-100",
                        !isComplete && "opacity-70 hover:opacity-100"
                      )}
                      style={{
                        backgroundColor: metadata?.color || '#CBD5E1',
                        color: metadata?.color ? getContrastColor(metadata.color) : 'inherit'
                      }}
                      onClick={() => !isComplete && handleApplyToAll(tag)}
                    >
                      <span className="flex items-center gap-1">
                        {tag} ({count}/{totalTrades})
                        {isComplete && <Check className="h-3 w-3 ml-1" />}
                        {isApplying === tag && (
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent ml-1" />
                        )}
                      </span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {isComplete 
                        ? t('mindset.tags.allTradesTagged')
                        : t('mindset.tags.clickToApplyToAll')
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">{t('mindset.tags.description')}</p>
    </div>
  )
}

// Helper function to determine text color based on background color
function getContrastColor(hexColor: string): string {
  // Remove the hash if it exists
  const color = hexColor.replace('#', '')
  
  // Convert hex to RGB
  const r = parseInt(color.substring(0, 2), 16)
  const g = parseInt(color.substring(2, 4), 16)
  const b = parseInt(color.substring(4, 6), 16)
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}
