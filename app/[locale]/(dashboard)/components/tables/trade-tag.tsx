'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Search, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/locales/client'
import { addTagToTrade, removeTagFromTrade } from '@/server/trades'
import { useUserData } from '@/components/context/user-data'
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
import { createTag } from '@/server/tags'
import { Tag, Trade } from '@prisma/client'

interface TradeTagProps {
  trade: Trade
  tradeIds: string[]
}

export function TradeTag({ trade, tradeIds }: TradeTagProps) {
  const t = useI18n()
  const { updateTrade, tagFilter, setTagFilter, setTags, tags } = useUserData()
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [localTags, setLocalTags] = useState(trade.tags)
  const [isUpdating, setIsUpdating] = useState(false)

  // Update localTags when trade.tags changes
  useEffect(() => {
    setLocalTags(trade.tags)
  }, [trade.tags])

  const handleAddTag = async (tag: string) => {
    const trimmedTag = tag.trim()
    if (!trimmedTag) return

    setIsUpdating(true)
    try {
      // Update local state immediately
      const newTags = [...localTags, trimmedTag]
      setLocalTags(newTags)
      
      // Update all trades in the list
      tradeIds.forEach(tradeId => {
        updateTrade(tradeId, { tags: newTags })
      })

      // If this is a new tag not in availableTags, it will be added through the sync process
      const existingTag = tags.find(t => t.name === trimmedTag)
      if (existingTag) {
        await Promise.all(tradeIds.map(tradeId => 
          addTagToTrade(tradeId, trimmedTag)
        ))
      } else {
        // Create a new tag in database
        const newTag = await createTag({
          name: trimmedTag,
          description: '',
          color: '#CBD5E1'
        })
        await Promise.all(tradeIds.map(tradeId => 
          addTagToTrade(tradeId, trimmedTag)
        ))
        setTags((tags: Tag[]) => [...tags, newTag.tag])
      }
      
      setInputValue('')
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to add tag:', error)
      // Revert local state on error
      setLocalTags(trade.tags)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemoveTag = async (tagToRemove: string) => {
    setIsUpdating(true)
    try {
      // Update local state immediately
      const newTags = localTags.filter(tag => tag !== tagToRemove)
      setLocalTags(newTags)
      
      // Update all trades in the list
      tradeIds.forEach(tradeId => {
        updateTrade(tradeId, { tags: newTags })
      })
      
      // Update tag filter if the removed tag was selected
      if (tagFilter.tags.includes(tagToRemove)) {
        setTagFilter(prev => ({
          tags: prev.tags.filter(t => t !== tagToRemove)
        }))
      }

      // Remove tag from all trades in the database
      await Promise.all(tradeIds.map(tradeId => 
        removeTagFromTrade(tradeId, tagToRemove)
      ))
    } catch (error) {
      console.error('Failed to remove tag:', error)
      // Revert local state on error
      setLocalTags(trade.tags)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 flex-wrap">
        {localTags.map((tag, index) => {
          const metadata = tags.find(t => t.name.toLowerCase() === tag.toLowerCase())
          return (
            <div 
              key={index} 
              className="rounded-md px-2 py-1 text-xs flex items-center gap-1"
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
                    .filter(tag => !localTags.includes(tag.name))
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
                            className="w-3 h-3 rounded-full"
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