'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { useData } from '@/context/data-provider'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Trade } from '@/prisma/generated/prisma/browser'
import { useUserStore } from '@/store/user-store'
import { intersectionTagLists, uniqueTradeIds } from '@/lib/trades/tag-merge'
import { TradeTagPicker } from './trade-tag-picker'

interface TradeTagProps {
  trade: Trade & { trades?: Trade[] }
  tradeIds: string[]
}

export function TradeTag({ trade, tradeIds }: TradeTagProps) {
  const t = useI18n()
  const { tagFilter, setTagFilter, updateTradeTags } = useData()
  const tags = useUserStore(state => state.tags)
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const targetIds = uniqueTradeIds(tradeIds)
  const displayedTags = trade.tags
  const hiddenTagNames = useMemo(() => {
    const subTrades = trade.trades ?? []
    if (subTrades.length > 1) {
      return intersectionTagLists(subTrades.map((subTrade) => subTrade.tags))
    }
    return displayedTags
  }, [displayedTags, trade.trades])

  const handleAddTag = async (tag: string) => {
    const trimmedTag = tag.trim()
    if (!trimmedTag) return

    setIsUpdating(true)
    try {
      await updateTradeTags(targetIds, trimmedTag, 'add')
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to add tag:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemoveTag = async (tagToRemove: string) => {
    setIsUpdating(true)
    try {
      await updateTradeTags(targetIds, tagToRemove, 'remove')

      if (tagFilter.tags.includes(tagToRemove)) {
        setTagFilter(prev => ({
          tags: prev.tags.filter(t => t !== tagToRemove)
        }))
      }
    } catch (error) {
      console.error('Failed to remove tag:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 flex-wrap">
        {displayedTags.map((tag, index) => {
          const metadata = tags.find(t => t.name.toLowerCase() === tag.toLowerCase())
          return (
            <div 
              key={index} 
              className="rounded-md px-2 py-1 text-xs flex items-center gap-1 break-words whitespace-normal h-auto max-w-[150px]"
              style={{ 
                backgroundColor: metadata?.color || '#CBD5E1',
                color: metadata?.color ? getContrastColor(metadata.color) : 'inherit'
              }}
            >
              {tag}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveTag(tag)
                }}
                className="hover:text-destructive"
                disabled={isUpdating}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
      <Popover 
        open={isOpen} 
        onOpenChange={setIsOpen}
      >
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
            disabled={isUpdating}
            aria-label={t('trade-table.bulkAddTag')}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="relative p-0" side="right" align="start">
          <TradeTagPicker
            tags={tags}
            hiddenTagNames={hiddenTagNames}
            allowCreate
            isUpdating={isUpdating}
            onSelectTag={handleAddTag}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function getContrastColor(hexColor: string): string {
  const color = hexColor.replace('#', '')
  
  const r = parseInt(color.substr(0, 2), 16)
  const g = parseInt(color.substr(2, 2), 16)
  const b = parseInt(color.substr(4, 2), 16)
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}
