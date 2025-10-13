import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useData } from "@/context/data-provider"
import { useI18n } from "@/locales/client"
import { FilterItem } from "@/app/[locale]/dashboard/types/filter"
import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { PnlRangeFilter } from "./pnl-range-filter"
import { AccountFilter } from "./account-filter"
import { useTradesStore } from "../../../../../store/trades-store"

interface FilterDropdownProps {
  type: 'instrument'
  items: FilterItem[]
  selectedItems: string[]
  onSelect: (value: string) => void
  onSelectAll: () => void
  isItemDisabled: (item: FilterItem) => boolean
  isItemSelected: (item: FilterItem) => boolean
  className?: string
}

function FilterDropdown({ 
  type, 
  items, 
  selectedItems, 
  onSelect, 
  onSelectAll,
  isItemDisabled,
  isItemSelected,
  className
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const t = useI18n()

  const filteredItems = searchTerm
    ? items.filter(item => item.value.toLowerCase().includes(searchTerm.toLowerCase()))
    : items

  const buttonText = {
    instrument: t('filters.instruments')
  }

  const selectAllText = {
    instrument: t('filters.selectAllInstruments')
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={`flex items-center ${className || ''}`}>
          <span className="flex-1 text-left">{buttonText[type]}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[300px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={t('filters.search')} 
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandEmpty>{t('filters.noResults')}</CommandEmpty>
          <CommandList>
            <ScrollArea className="h-[300px]">
              <CommandGroup>
                <CommandItem
                  onSelect={onSelectAll}
                  className="flex items-center gap-2"
                >
                  <Checkbox
                    checked={items.every(item => isItemSelected(item))}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{selectAllText[type]}</span>
                </CommandItem>
                {filteredItems.map(item => (
                  <CommandItem
                    key={item.value}
                    onSelect={() => onSelect(item.value)}
                    disabled={isItemDisabled(item)}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={isItemSelected(item)}
                      className="h-4 w-4 shrink-0"
                      disabled={isItemDisabled(item)}
                    />
                    <span className="text-sm break-all pr-2">
                      {item.value}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface FilterDropdownsProps {
  showAccountNumbers: boolean
}

export function FilterDropdowns({ showAccountNumbers }: FilterDropdownsProps) {
  const { instruments = [], setInstruments } = useData()
  const trades = useTradesStore(state => state.trades)
  const [allItems, setAllItems] = useState<FilterItem[]>([])

  useEffect(() => {
    if (!trades?.length) return

    const uniqueInstruments = Array.from(new Set(trades.map(trade => trade.instrument)))
    
    setAllItems(
      uniqueInstruments.map(instrument => ({ type: 'instrument' as const, value: instrument }))
    )
  }, [trades])

  const handleSelectAll = (type: 'instrument') => {
    const itemsOfType = allItems.filter(item => item.type === type)
    const availableItems = itemsOfType.filter(item => !isItemDisabled(item))
    
    switch (type) {
      case 'instrument':
        setInstruments((prev: string[]) => 
          prev.length === availableItems.length ? [] : availableItems.map(i => i.value)
        )
        break
    }
  }

  const isItemDisabled = (item: FilterItem) => {
    if (item.type === 'instrument') {
      return false
    }
    return false
  }

  const isItemSelected = (item: FilterItem): boolean => {
    switch (item.type) {
      case 'instrument':
        return instruments.includes(item.value)
      default:
        return false
    }
  }

  const handleSelect = (type: 'instrument', value: string) => {
    switch (type) {
      case 'instrument':
        setInstruments(prev => 
          prev.includes(value) 
            ? prev.filter(instrument => instrument !== value)
            : [...prev, value]
        )
        break
    }
  }

  return (
    <div className="flex gap-2">
      <AccountFilter showAccountNumbers={showAccountNumbers} />
      <FilterDropdown
        type="instrument"
        items={allItems.filter(item => item.type === 'instrument')}
        selectedItems={instruments}
        onSelect={(value) => handleSelect('instrument', value)}
        onSelectAll={() => handleSelectAll('instrument')}
        isItemDisabled={isItemDisabled}
        isItemSelected={isItemSelected}
      />
      <PnlRangeFilter />
    </div>
  )
} 