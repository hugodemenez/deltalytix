import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useUserData } from "@/components/context/user-data"
import { useI18n } from "@/locales/client"
import { FilterItem, PropfirmGroup } from "@/types/filter"
import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"
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
  onSelectGroup?: (group: string, items: FilterItem[]) => void
  isItemDisabled: (item: FilterItem) => boolean
  isItemSelected: (item: FilterItem) => boolean
  anonymizeAccount?: (account: string) => string
  className?: string
  groupedItems?: { [key: string]: FilterItem[] }
}

function FilterDropdown({ 
  type, 
  items, 
  selectedItems, 
  onSelect, 
  onSelectAll,
  onSelectGroup,
  isItemDisabled,
  isItemSelected,
  anonymizeAccount,
  className,
  groupedItems
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const t = useI18n()

  const filteredItems = searchTerm
    ? items.filter(item => item.value.toLowerCase().includes(searchTerm.toLowerCase()))
    : items

  const filteredGroupedItems = searchTerm && groupedItems
    ? Object.entries(groupedItems).reduce((acc, [group, items]) => {
        const filtered = items.filter(item => 
          item.value.toLowerCase().includes(searchTerm.toLowerCase())
        )
        if (filtered.length > 0) {
          acc[group] = filtered
        }
        return acc
      }, {} as { [key: string]: FilterItem[] })
    : groupedItems

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

  const isGroupSelected = (groupItems: FilterItem[]) => {
    const selectableItems = groupItems.filter(item => !isItemDisabled(item))
    return selectableItems.length > 0 && selectableItems.every(item => isItemSelected(item))
  }

  const isGroupIndeterminate = (groupItems: FilterItem[]) => {
    const selectableItems = groupItems.filter(item => !isItemDisabled(item))
    const selectedCount = selectableItems.filter(item => isItemSelected(item)).length
    return selectedCount > 0 && selectedCount < selectableItems.length
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
                {type === 'account' && filteredGroupedItems ? (
                  Object.entries(filteredGroupedItems).map(([group, groupItems]) => (
                    <CommandGroup key={group} className="px-2">
                      <CommandItem
                        onSelect={() => onSelectGroup?.(group, groupItems)}
                        className="flex items-center gap-2 bg-muted/50"
                      >
                        <Checkbox
                          checked={isGroupSelected(groupItems)}
                          className="h-4 w-4"
                          data-state={isGroupIndeterminate(groupItems) ? 'indeterminate' : undefined}
                        />
                        <span className="text-sm font-medium">{group}</span>
                      </CommandItem>
                      {groupItems.map(item => (
                        <CommandItem
                          key={item.value}
                          onSelect={() => onSelect(item.value)}
                          disabled={isItemDisabled(item)}
                          className="flex items-center gap-2 pl-6"
                        >
                          <Checkbox
                            checked={isItemSelected(item)}
                            className="h-4 w-4 flex-shrink-0"
                            disabled={isItemDisabled(item)}
                          />
                          <span className="text-sm break-all pr-2">
                            {anonymizeAccount ? anonymizeAccount(item.value) : item.value}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))
                ) : (
                  filteredItems.map(item => (
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
                  ))
                )}
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
  const { 
    trades = [], 
    accountNumbers = [], 
    setAccountNumbers, 
    instruments = [], 
    setInstruments,
    propfirmAccounts = []
  } = useUserData()
  const [allItems, setAllItems] = useState<FilterItem[]>([])
  const [groupedAccounts, setGroupedAccounts] = useState<{ [key: string]: FilterItem[] }>({})
  const t = useI18n()

  useEffect(() => {
    if (!trades?.length) return

    const uniqueAccounts = Array.from(new Set(trades.map(trade => trade.accountNumber)))
    const uniqueInstruments = Array.from(new Set(trades.map(trade => trade.instrument)))
    
    // Group accounts by propfirm using propfirmAccounts data
    const grouped = uniqueAccounts.reduce((acc, account) => {
      // Find the propfirm account in our propfirmAccounts data
      const propfirmAccount = propfirmAccounts.find(pa => pa.number === account)
      const groupName = propfirmAccount?.propfirm || 'Other'
      
      if (!acc[groupName]) {
        acc[groupName] = []
      }
      
      acc[groupName].push({
        type: 'account' as const,
        value: account
      })
      
      return acc
    }, {} as { [key: string]: FilterItem[] })
    
    setGroupedAccounts(grouped)
    
    setAllItems([
      ...uniqueAccounts.map(account => ({ type: 'account' as const, value: account })),
      ...uniqueInstruments.map(instrument => ({ type: 'instrument' as const, value: instrument }))
    ])
  }, [trades, propfirmAccounts])

  const handleSelectGroup = (group: string, groupItems: FilterItem[]) => {
    const selectableItems = groupItems.filter(item => !isItemDisabled(item))
    const allSelected = selectableItems.every(item => accountNumbers.includes(item.value))
    
    if (allSelected) {
      // Deselect all accounts in the group
      setAccountNumbers(prev => 
        prev.filter(account => !selectableItems.some(item => item.value === account))
      )
    } else {
      // Select all accounts in the group that aren't already selected
      setAccountNumbers(prev => [
        ...prev,
        ...selectableItems
          .map(item => item.value)
          .filter(account => !prev.includes(account))
      ])
    }
  }

  const handleSelectAll = (type: 'account' | 'instrument') => {
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

  const isItemSelected = (item: FilterItem): boolean => {
    switch (item.type) {
      case 'account':
        return accountNumbers.includes(item.value)
      case 'instrument':
        return instruments.includes(item.value)
      default:
        return false
    }
  }

  const anonymizeAccount = (account: string) => {
    if (!showAccountNumbers) {
      return account.slice(0, 3) + '*'.repeat(Math.max(0, account.length - 7)) + account.slice(-4)
    }
    return account
  }

  const handleSelect = (type: 'account' | 'instrument', value: string) => {
    switch (type) {
      case 'account':
        setAccountNumbers(prev => 
          prev.includes(value) 
            ? prev.filter(account => account !== value)
            : [...prev, value]
        )
        break
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
      <FilterDropdown
        type="account"
        items={allItems.filter(item => item.type === 'account')}
        selectedItems={accountNumbers}
        onSelect={(value) => handleSelect('account', value)}
        onSelectAll={() => handleSelectAll('account')}
        onSelectGroup={handleSelectGroup}
        isItemDisabled={isItemDisabled}
        isItemSelected={isItemSelected}
        anonymizeAccount={anonymizeAccount}
        groupedItems={groupedAccounts}
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