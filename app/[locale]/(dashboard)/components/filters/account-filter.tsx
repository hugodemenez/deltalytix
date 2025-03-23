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
import { FilterItem } from "@/types/filter"
import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"

interface AccountFilterProps {
  showAccountNumbers: boolean
  className?: string
}

export function AccountFilter({ showAccountNumbers, className }: AccountFilterProps) {
  const { trades = [], accountNumbers = [], setAccountNumbers, propfirmAccounts = [] } = useUserData()
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [groupedAccounts, setGroupedAccounts] = useState<{ [key: string]: FilterItem[] }>({})
  const t = useI18n()

  useEffect(() => {
    if (!trades?.length) return

    const uniqueAccounts = Array.from(new Set(trades.map(trade => trade.accountNumber)))
    
    // Group accounts by propfirm using propfirmAccounts data
    const grouped = uniqueAccounts.reduce((acc, account) => {
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
  }, [trades, propfirmAccounts])

  const filteredGroupedAccounts = searchTerm
    ? Object.entries(groupedAccounts).reduce((acc, [group, items]) => {
        const filtered = items.filter(item => 
          item.value.toLowerCase().includes(searchTerm.toLowerCase())
        )
        if (filtered.length > 0) {
          acc[group] = filtered
        }
        return acc
      }, {} as { [key: string]: FilterItem[] })
    : groupedAccounts

  const handleSelectGroup = (group: string, groupItems: FilterItem[]) => {
    const selectableItems = groupItems.filter(item => !isItemDisabled(item))
    const allSelected = selectableItems.every(item => accountNumbers.includes(item.value))
    
    if (allSelected) {
      setAccountNumbers(prev => 
        prev.filter(account => !selectableItems.some(item => item.value === account))
      )
    } else {
      setAccountNumbers(prev => [
        ...prev,
        ...selectableItems
          .map(item => item.value)
          .filter(account => !prev.includes(account))
      ])
    }
  }

  const handleSelectAll = () => {
    const allAccounts = Object.values(groupedAccounts).flat()
    const availableAccounts = allAccounts.filter(item => !isItemDisabled(item))
    
    setAccountNumbers(prev => 
      prev.length === availableAccounts.length ? [] : availableAccounts.map(i => i.value)
    )
  }

  const isItemDisabled = (item: FilterItem) => false

  const isItemSelected = (item: FilterItem): boolean => {
    return accountNumbers.includes(item.value)
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

  const anonymizeAccount = (account: string) => {
    if (!showAccountNumbers) {
      return account.slice(0, 3) + '*'.repeat(Math.max(0, account.length - 7)) + account.slice(-4)
    }
    return account
  }

  const handleSelect = (value: string) => {
    setAccountNumbers(prev => 
      prev.includes(value) 
        ? prev.filter(account => account !== value)
        : [...prev, value]
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={`flex items-center ${className || ''}`}>
          <span className="flex-1 text-left">{t('filters.accounts')}</span>
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
                  onSelect={handleSelectAll}
                  className="flex items-center gap-2"
                >
                  <Checkbox
                    checked={Object.values(groupedAccounts).flat().every(item => isItemSelected(item))}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{t('filters.selectAllAccounts')}</span>
                </CommandItem>
                {Object.entries(filteredGroupedAccounts).map(([group, groupItems]) => (
                  <CommandGroup key={group} className="px-2">
                    <CommandItem
                      onSelect={() => handleSelectGroup(group, groupItems)}
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
                        onSelect={() => handleSelect(item.value)}
                        disabled={isItemDisabled(item)}
                        className="flex items-center gap-2 pl-6"
                      >
                        <Checkbox
                          checked={isItemSelected(item)}
                          className="h-4 w-4 flex-shrink-0"
                          disabled={isItemDisabled(item)}
                        />
                        <span className="text-sm break-all pr-2">
                          {anonymizeAccount(item.value)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 