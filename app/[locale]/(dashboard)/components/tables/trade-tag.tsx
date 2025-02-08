'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Search, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/locales/client'
import { addTagToTrade, removeTagFromTrade } from '@/server/trades'
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

interface TradeTagProps {
  tradeId: string
  tags: string[]
  availableTags: string[]
  onTagsChange?: (tags: string[]) => void
}

export function TradeTag({ tradeId, tags: initialTags, availableTags, onTagsChange }: TradeTagProps) {
  const t = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [localTags, setLocalTags] = useState(initialTags)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleAddTag = async (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase()
    if (!normalizedTag) return

    setIsUpdating(true)
    try {
      await addTagToTrade(tradeId, normalizedTag)
      const newTags = [...localTags, normalizedTag]
      setLocalTags(newTags)
      onTagsChange?.(newTags)
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
      await removeTagFromTrade(tradeId, tagToRemove)
      const newTags = localTags.filter(tag => tag !== tagToRemove)
      setLocalTags(newTags)
      onTagsChange?.(newTags)
    } catch (error) {
      console.error('Failed to remove tag:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 flex-wrap">
        {localTags.map((tag, index) => (
          <div 
            key={index} 
            className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs flex items-center gap-1"
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
        ))}
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
            <CommandList>
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
              {availableTags.length > 0 && (
                <CommandGroup heading={t('trade-table.existingTags')}>
                  {availableTags
                    .filter(tag => !localTags.includes(tag))
                    .filter(tag => {
                      const normalizedInput = inputValue.toLowerCase()
                      return !normalizedInput || tag.toLowerCase().includes(normalizedInput)
                    })
                    .map(tag => (
                      <CommandItem
                        key={tag}
                        value={tag}
                        onSelect={() => {
                          if (!isUpdating) {
                            handleAddTag(tag)
                          }
                        }}
                      >
                        {tag}
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