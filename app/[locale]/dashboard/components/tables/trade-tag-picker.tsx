'use client'

import { useState } from 'react'
import { useI18n } from '@/locales/client'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Tag } from '@/prisma/generated/prisma/browser'

interface TradeTagPickerProps {
  tags: Tag[]
  hiddenTagNames?: readonly string[]
  allowCreate?: boolean
  isUpdating?: boolean
  emptyLabel?: string
  onSelectTag: (tag: string) => void
}

export function TradeTagPicker({
  tags,
  hiddenTagNames = [],
  allowCreate = true,
  isUpdating = false,
  emptyLabel,
  onSelectTag,
}: TradeTagPickerProps) {
  const t = useI18n()
  const [inputValue, setInputValue] = useState('')
  const hidden = new Set(hiddenTagNames)
  const query = inputValue.trim()
  const visibleTags = tags.filter((tag) => {
    if (hidden.has(tag.name)) return false
    return !query || tag.name.toLowerCase().includes(query.toLowerCase())
  })
  const canCreate =
    allowCreate &&
    Boolean(query) &&
    !hidden.has(query) &&
    !tags.some((tag) => tag.name === query)

  return (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder={t('trade-table.searchTags')}
        value={inputValue}
        onValueChange={setInputValue}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && canCreate && !isUpdating) {
            event.preventDefault()
            onSelectTag(query)
          }
        }}
      />
      <CommandList className="max-h-[200px] overflow-y-auto">
        {canCreate && (
          <CommandItem
            value={query}
            onSelect={(value) => {
              if (!isUpdating) {
                onSelectTag(value)
              }
            }}
          >
            {t('trade-table.addTag', { tag: query })}
          </CommandItem>
        )}
        {visibleTags.length > 0 && (
          <CommandGroup heading={t('trade-table.existingTags')}>
            {visibleTags.map((tag) => (
              <CommandItem
                key={tag.name}
                value={tag.name}
                onSelect={() => {
                  if (!isUpdating) {
                    onSelectTag(tag.name)
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
        <CommandEmpty>
          {emptyLabel ?? t('trade-table.noTagsFound')}
        </CommandEmpty>
      </CommandList>
      {isUpdating && (
        <div className="absolute right-2 top-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
        </div>
      )}
    </Command>
  )
}
