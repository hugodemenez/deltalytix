'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/locales/client'
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
import { Tag } from '@prisma/client'
import { useUserStore } from '@/store/user-store'
import { createTagAction } from '@/server/tags'

interface DayTagSelectorProps {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
}

export function DayTagSelector({ selectedTags, onTagsChange }: DayTagSelectorProps) {
  const t = useI18n()
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
      // Add tag to selected tags
      const newTags = [...selectedTags, trimmedTag]
      onTagsChange(newTags)

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

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = selectedTags.filter(tag => tag !== tagToRemove)
    onTagsChange(newTags)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{t('mindset.tags.title')}</label>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {selectedTags.map((tag, index) => {
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
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-destructive ml-1"
                disabled={isUpdating}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )
        })}
        <Popover 
          open={isOpen} 
          onOpenChange={setIsOpen}
        >
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2"
              disabled={isUpdating}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('mindset.tags.add')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" side="right" align="start">
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder={t('mindset.tags.search')}
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
                    {t('mindset.tags.create', { tag: inputValue.trim() })}
                  </CommandItem>
                )}
                {tags.length > 0 && (
                  <CommandGroup heading={t('mindset.tags.existing')}>
                    {tags
                      .filter(tag => !selectedTags.includes(tag.name))
                      .filter(tag => {
                        const input = inputValue.trim().toLowerCase()
                        return !input || tag.name.toLowerCase().includes(input)
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
                <CommandEmpty>{t('mindset.tags.noTags')}</CommandEmpty>
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
