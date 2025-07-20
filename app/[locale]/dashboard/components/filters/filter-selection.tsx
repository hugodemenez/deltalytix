'use client'

import { FilterItem } from '@/app/[locale]/dashboard/types/filter'
import { Checkbox } from '@/components/ui/checkbox'
import { CommandItem } from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useI18n } from "@/locales/client"

interface FilterSectionProps {
  items: FilterItem[]
  type: 'instrument' | 'propfirm'
  searchTerm: string
  handleSelect: (value: string) => void
  isItemDisabled: (item: FilterItem) => boolean
  isItemSelected: (item: FilterItem) => boolean
  handleSelectAll: (type: 'instrument' | 'propfirm') => void
  anonymizeAccount: (account: string) => string
}

export function FilterSection({ type, items, searchTerm, handleSelect, isItemDisabled, isItemSelected, handleSelectAll, anonymizeAccount }: FilterSectionProps) {
  const t = useI18n()
  
  const selectAllText = {
    propfirm: t('filters.selectAllPropfirms'),
    instrument: t('filters.selectAllInstruments')
  }

  const filteredSectionItems = searchTerm
    ? items.filter(item => item.value.toLowerCase().includes(searchTerm.toLowerCase()))
    : items

  function handleScroll(e: React.WheelEvent) {
    e.preventDefault()
    e.stopPropagation()
    
    const scrollArea = e.currentTarget
    const delta = e.deltaY
    scrollArea.scrollTop += delta
  }

  return (
    <div className="flex flex-col h-full">
      <CommandItem
        onSelect={() => handleSelectAll(type)}
        className="flex items-center gap-2 px-2 bg-muted/50"
      >
        <Checkbox
          checked={items.every(item => isItemSelected(item))}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium">{selectAllText[type]}</span>
      </CommandItem>
      <ScrollArea 
        className="flex-1"
        onWheel={handleScroll}
        style={{ overscrollBehavior: 'contain' }}
      >
        <div 
          className="p-2"
          onTouchMove={e => e.stopPropagation()}
        >
          {filteredSectionItems.map(item => (
            <CommandItem 
              key={item.value} 
              onSelect={() => handleSelect(`${type}:${item.value}`)}
              disabled={isItemDisabled(item)}
              className="cursor-pointer"
            >
              <Checkbox 
                checked={isItemSelected(item)} 
                className="mr-2" 
                disabled={isItemDisabled(item)}
              />
              {item.value}
            </CommandItem>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
