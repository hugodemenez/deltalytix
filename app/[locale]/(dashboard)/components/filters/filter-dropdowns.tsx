import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFormattedTrades, useTrades } from "@/components/context/trades-data"
import { useI18n } from "@/locales/client"
import { FilterItem, PropfirmGroup } from "@/types/filter"
import { useState, useEffect } from "react"
import { ChevronDown, Eye, EyeOff } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { PnlRangeFilter } from "./pnl-range-filter"

const propfirmGroups: PropfirmGroup[] = [
  { name: 'FastTrackTrading', prefix: 'FTT' },
  { name: 'Phidias', prefix: 'PP' },
  { name: 'Bulenox', prefix: 'BX' },
  { name: 'Other', prefix: '' },
]

interface FilterDropdownProps {
  type: 'account' | 'instrument' | 'propfirm'
  items: FilterItem[]
  selectedItems: string[]
  onSelect: (value: string) => void
  onSelectAll: () => void
  isItemDisabled: (item: FilterItem) => boolean
  isItemSelected: (item: FilterItem) => boolean
  anonymizeAccount?: (account: string) => string
}

function FilterDropdown({ 
  type, 
  items, 
  selectedItems, 
  onSelect, 
  onSelectAll,
  isItemDisabled,
  isItemSelected,
  anonymizeAccount 
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const t = useI18n()

  const filteredItems = searchTerm
    ? items.filter(item => item.value.toLowerCase().includes(searchTerm.toLowerCase()))
    : items

  const buttonText = {
    account: t('filters.accounts'),
    propfirm: t('filters.propfirms'),
    instrument: t('filters.instruments')
  }

  const selectAllText = {
    account: t('filters.selectAllAccounts'),
    propfirm: t('filters.selectAllPropfirms'),
    instrument: t('filters.selectAllInstruments')
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex gap-2">
          {buttonText[type]}
          <ChevronDown className="h-4 w-4" />
          {selectedItems?.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/10 px-2 text-xs">
              {selectedItems.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={t('filters.search')} 
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandEmpty>{t('filters.noResults')}</CommandEmpty>
          <CommandList>
            <ScrollArea className="h-[200px]">
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
                      className="h-4 w-4 flex-shrink-0"
                      disabled={isItemDisabled(item)}
                    />
                    <span className="text-sm break-all pr-2">
                      {type === 'account' && anonymizeAccount 
                        ? anonymizeAccount(item.value) 
                        : item.value}
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
  const { trades = [] } = useTrades()
  const { 
    accountNumbers = [], 
    setAccountNumbers, 
    instruments = [], 
    setInstruments,
  } = useFormattedTrades()
  const [allItems, setAllItems] = useState<FilterItem[]>([])
  const [propfirms, setPropfirms] = useState<string[]>([])
  const t = useI18n()

  useEffect(() => {
    if (!trades?.length) return

    const uniqueAccounts = Array.from(new Set(trades.map(trade => trade.accountNumber)))
    const uniqueInstruments = Array.from(new Set(trades.map(trade => trade.instrument)))
    const uniquePropfirms = Array.from(new Set(uniqueAccounts.map(account => {
      const propfirm = propfirmGroups.find(group => account.startsWith(group.prefix))
      return propfirm ? propfirm.name : 'Other'
    })))
    
    setAllItems([
      ...uniqueAccounts.map(account => ({ type: 'account' as const, value: account })),
      ...uniqueInstruments.map(instrument => ({ type: 'instrument' as const, value: instrument })),
      ...uniquePropfirms.map(propfirm => ({ type: 'propfirm' as const, value: propfirm }))
    ])
  }, [trades])

  const handleSelect = (type: 'account' | 'instrument' | 'propfirm', value: string) => {
    switch (type) {
      case 'account':
        setAccountNumbers(prev => 
          prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value]
        )
        break
      case 'instrument':
        setInstruments(prev => 
          prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]
        )
        break
      case 'propfirm':
        setPropfirms((prev: string[]) => {
          const newPropfirms = prev.includes(value) 
            ? prev.filter(p => p !== value) 
            : [...prev, value]
          
          // Get the propfirm group info
          const propfirmGroup = propfirmGroups.find(group => group.name === value)
          
          // Get all accounts for this propfirm
          const relatedAccounts = allItems
            .filter(item => item.type === 'account')
            .map(item => item.value)
            .filter(account => {
              if (value === 'Other') {
                return !propfirmGroups.some(g => 
                  g.name !== 'Other' && account.startsWith(g.prefix)
                )
              }
              return propfirmGroup && account.startsWith(propfirmGroup.prefix)
            })

          // Update account numbers based on propfirm selection
          if (newPropfirms.includes(value)) {
            // Add all related accounts that aren't already selected
            setAccountNumbers(prev => [
              ...prev,
              ...relatedAccounts.filter(account => !prev.includes(account))
            ])
          } else {
            // Remove all related accounts
            setAccountNumbers(prev => 
              prev.filter(account => !relatedAccounts.includes(account))
            )
          }

          return newPropfirms
        })
        break
    }
  }

  const handleSelectAll = (type: 'account' | 'instrument' | 'propfirm') => {
    const itemsOfType = allItems.filter(item => item.type === type)
    const availableItems = itemsOfType.filter(item => !isItemDisabled(item))
    
    switch (type) {
      case 'account':
        setAccountNumbers((prev: string[]) => 
          prev.length === availableItems.length ? [] : availableItems.map(i => i.value)
        )
        break
      case 'instrument':
        setInstruments((prev: string[]) => 
          prev.length === availableItems.length ? [] : availableItems.map(i => i.value)
        )
        break
      case 'propfirm':
        setPropfirms((prev: string[]) => 
          prev.length === availableItems.length ? [] : availableItems.map(i => i.value)
        )
        break
    }
  }

  const isItemDisabled = (item: FilterItem) => {
    if (item.type === 'instrument') {
      return accountNumbers.length > 0 && !trades.some(trade => 
        accountNumbers.includes(trade.accountNumber) && trade.instrument === item.value
      )
    }
    return false
  }

  const isItemSelected = (item: FilterItem) => {
    switch (item.type) {
      case 'account':
        return accountNumbers.includes(item.value)
      case 'instrument':
        return instruments.includes(item.value)
      case 'propfirm':
        return propfirms.includes(item.value)
    }
  }

  const anonymizeAccount = (account: string) => {
    if (!showAccountNumbers) {
      return account.slice(0, 3) + '*'.repeat(Math.max(0, account.length - 7)) + account.slice(-4)
    }
    return account
  }

  return (
    <div className="flex gap-2">
      <FilterDropdown
        type="account"
        items={allItems.filter(item => item.type === 'account')}
        selectedItems={accountNumbers}
        onSelect={(value) => handleSelect('account', value)}
        onSelectAll={() => handleSelectAll('account')}
        isItemDisabled={isItemDisabled}
        isItemSelected={isItemSelected}
        anonymizeAccount={anonymizeAccount}
      />
      <FilterDropdown
        type="propfirm"
        items={allItems.filter(item => item.type === 'propfirm')}
        selectedItems={propfirms}
        onSelect={(value) => handleSelect('propfirm', value)}
        onSelectAll={() => handleSelectAll('propfirm')}
        isItemDisabled={isItemDisabled}
        isItemSelected={isItemSelected}
      />
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