'use client'

import { FilterItem } from '@/types/filter'
import { Checkbox } from '@/components/ui/checkbox'
import { CommandItem } from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll-area'

export const FilterSection = ({ 
  title, 
  items, 
  type, 
  searchTerm, 
  handleSelect, 
  isItemDisabled, 
  isItemSelected, 
  handleSelectAll,
  anonymizeAccount
}: { 
  title: string, 
  items: FilterItem[], 
  type: 'account' | 'instrument' | 'propfirm',
  searchTerm: string,
  handleSelect: (selectedValue: string) => void,
  isItemDisabled: (item: FilterItem) => boolean,
  isItemSelected: (item: FilterItem) => boolean,
  handleSelectAll: (type: 'account' | 'instrument' | 'propfirm') => void,
  anonymizeAccount: (account: string) => string
}) => {
  const filteredSectionItems = searchTerm
    ? items.filter(item => item.value.toLowerCase().includes(searchTerm.toLowerCase()))
    : items

  return (
    <div className="mb-4">
      <h3 className="text-md font-semibold mb-2">{title}</h3>
      <div className="rounded-md border">
        <CommandItem onSelect={() => handleSelectAll(type)} className="cursor-pointer border-b">
          <Checkbox 
            checked={items.filter(item => !isItemDisabled(item)).every(item => isItemSelected(item))}
            className="mr-2"
          />
          Select All {title}
        </CommandItem>
        <ScrollArea className="max-h-[120px] overflow-y-auto">
          <div className="p-2">
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
                {type === 'account' ? anonymizeAccount(item.value) : item.value}
              </CommandItem>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
