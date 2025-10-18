"use client"

import { useState, useEffect } from 'react'
import { useI18n } from '@/locales/client'
import { useData } from '@/context/data-provider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Search } from 'lucide-react'
import { useUserStore } from '../../../../../store/user-store'

interface TagFilterProps {
  className?: string
}

export function TagFilter({ className }: TagFilterProps) {
  const t = useI18n()
  const { tagFilter, setTagFilter } = useData()
  const tags = useUserStore(state => state.tags)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredTags, setFilteredTags] = useState<typeof tags>([])

  useEffect(() => {
    // Filter tags based on search query
    const filtered = tags?.filter(tag => 
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? []
    setFilteredTags(filtered)
  }, [tags, searchQuery])

  const handleSelect = (tagName: string) => {
    setTagFilter(prev => ({
      tags: prev.tags.includes(tagName)
        ? prev.tags.filter(t => t !== tagName)
        : [...prev.tags, tagName]
    }))
  }

  const handleSelectAll = () => {
    const allTagNames = tags.map(tag => tag.name)
    const allSelected = allTagNames.every(name => tagFilter.tags.includes(name))
    
    setTagFilter({
      tags: allSelected ? [] : allTagNames
    })
  }

  const isItemSelected = (tagName: string) => {
    return tagFilter.tags.includes(tagName)
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{t('widgets.tags.title')}</Label>
      <Command className="rounded-lg border" shouldFilter={false}>
        <div className="border-b">
          <div className="flex items-center gap-2 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('widgets.tags.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
            />
          </div>
        </div>
        <CommandList>
          <ScrollArea className="h-[200px]">
            <CommandGroup>
              <CommandItem
                onSelect={handleSelectAll}
                className="flex items-center gap-2 px-2 bg-muted/50"
              >
                <Checkbox
                  checked={tags.length > 0 && tags.every(tag => isItemSelected(tag.name))}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">{t('widgets.tags.selectAll')}</span>
              </CommandItem>
              
              {filteredTags.map((tag) => (
                <CommandItem
                  key={tag.id}
                  onSelect={() => handleSelect(tag.name)}
                  className="flex items-center gap-2 px-2"
                >
                  <Checkbox
                    checked={isItemSelected(tag.name)}
                    className="h-4 w-4"
                  />
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color || '#CBD5E1' }}
                  />
                  <span className="text-sm truncate">{tag.name}</span>
                </CommandItem>
              ))}
              
              {filteredTags.length === 0 && (
                <CommandEmpty>
                  {searchQuery ? t('widgets.tags.noResults') : t('widgets.tags.noTags')}
                </CommandEmpty>
              )}
            </CommandGroup>
          </ScrollArea>
        </CommandList>
      </Command>
    </div>
  )
} 