'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Search, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/locales/client'
import { useData } from '@/context/data-provider'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tag, Trade } from '@/prisma/generated/prisma/browser'
import { useUserStore } from '@/store/user-store'
import { createTagAction } from '@/server/tags'

interface TradeTagProps {
  trade: Trade
  tradeIds: string[]
}

export function TradeTag({ trade, tradeIds }: TradeTagProps) {
  const t = useI18n()
  const { tagFilter, setTagFilter, updateTrades } = useData()
  const tags = useUserStore(state => state.tags)
  const setTags = useUserStore(state => state.setTags)
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleAddTag = async (tag: string) => {
    const trimmedTag = tag.trim()
    if (!trimmedTag) return

    setIsUpdating(true)
    try {
      // Update all trades in the list
      const update = {
        tags: [...trade.tags, trimmedTag]
      }
      await updateTrades(tradeIds, update)

      // If this is a new tag not in availableTags, add it
      const existingTag = tags.find(t => t.name === trimmedTag)
      if (!existingTag) {
        const newTag = await createTagAction({
          name: trimmedTag,
          description: '',
          color: '#CBD5E1'
        })
        setTags([...tags, newTag.tag])
      }
      
      setInputValue('')
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
      const update = {
        tags: trade.tags.filter(tag => tag !== tagToRemove)
      }
      // Update all trades in the list
      await updateTrades(tradeIds, update)
      
      // Update tag filter if the removed tag was selected
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
        {trade.tags.map((tag, index) => {
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
          >
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" side="right" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder={t('trade-table.searchTags')}
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputValue && !isUpdating) {
                  e.preventDefault()
                  handleAddTag(inputValue)
                }
              }}
            />
            <CommandList className="max-h-[200px] overflow-y-auto">
              {inputValue.trim() && (
                <CommandItem
                  value={inputValue.trim()}
                  onSelect={(value) => {
                    if (!isUpdating) {
                      handleAddTag(value)
                    }
                  }}
                >
                  {t('trade-table.addTag', { tag: inputValue.trim() })}
                </CommandItem>
              )}
              {tags.length > 0 && (
                <CommandGroup heading={t('trade-table.existingTags')}>
                  {tags
                    .filter(tag => !trade.tags.includes(tag.name))
                    .filter(tag => {
                      const input = inputValue.trim()
                      return !input || tag.name.includes(input)
                    })
                    .map(tag => (
                      <CommandItem
                        key={tag.name}
                        value={tag.name}
                        onSelect={() => {
                          if (!isUpdating) {
                            handleAddTag(tag.name)
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: tag.color || '#CBD5E1' }}
                          />
                          <span>{tag.name}</span>
                          {tag.description && (
                            <span className="text-muted-foreground text-xs">
                              - {tag.description}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
              <CommandEmpty>{t('trade-table.noTagsFound')}</CommandEmpty>
            </CommandList>
          </Command>
          {isUpdating && (
            <div className="absolute right-2 top-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Helper function to determine text color based on background color
function getContrastColor(hexColor: string): string {
  // Remove the hash if it exists
  const color = hexColor.replace('#', '')
  
  // Convert hex to RGB
  const r = parseInt(color.substr(0, 2), 16)
  const g = parseInt(color.substr(2, 2), 16)
  const b = parseInt(color.substr(4, 2), 16)
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
} 