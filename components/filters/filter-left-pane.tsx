'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTrades, useFormattedTrades } from '../context/trades-data'
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Filter } from "lucide-react"
import { useMediaQuery } from '@/hooks/use-media-query'
import { Switch } from "@/components/ui/switch"
import DateCalendarFilter from './date-calendar-filter'

interface FilterItem {
  type: 'account' | 'instrument' | 'propfirm'
  value: string
}

interface PropfirmGroup {
  name: string
  prefix: string
}

const propfirmGroups: PropfirmGroup[] = [
  { name: 'FastTrackTrading', prefix: 'FTT' },
  { name: 'Phidias', prefix: 'PP' },
  { name: 'Bulenox', prefix: 'BX' },
  // Add more propfirms as needed
]

export default function FilterLeftPane() {
  const { trades } = useTrades()
  const { accountNumbers, setAccountNumbers, instruments, setInstruments } = useFormattedTrades()
  
  const [allItems, setAllItems] = useState<FilterItem[]>([])
  const [selectedItems, setSelectedItems] = useState<FilterItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAccountNumbers, setShowAccountNumbers] = useState(true)
  const isMobile = useMediaQuery("(max-width: 768px)")

  const filterRef = useRef<HTMLDivElement>(null)

  const disableScroll = useCallback(() => {
    document.body.style.overflow = 'hidden'
  }, [])

  const enableScroll = useCallback(() => {
    document.body.style.overflow = ''
  }, [])

  const [propfirms, setPropfirms] = useState<string[]>([])

  useEffect(() => {
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

  useEffect(() => {
    setSelectedItems([
      ...accountNumbers.map(account => ({ type: 'account' as const, value: account })),
      ...instruments.map(instrument => ({ type: 'instrument' as const, value: instrument })),
      ...propfirms.map(propfirm => ({ type: 'propfirm' as const, value: propfirm }))
    ])
  }, [accountNumbers, instruments, propfirms])

  const handleItemChange = useCallback((item: FilterItem) => {
    setSelectedItems(prev => {
      const newItems = prev.some(i => i.type === item.type && i.value === item.value)
        ? prev.filter(i => !(i.type === item.type && i.value === item.value))
        : [...prev, item]

      // If a propfirm is selected/deselected, update the related accounts
      if (item.type === 'propfirm') {
        const propfirmGroup = propfirmGroups.find(group => group.name === item.value)
        if (propfirmGroup) {
          const relatedAccounts = allItems
            .filter(i => i.type === 'account' && i.value.startsWith(propfirmGroup.prefix))
          
          if (newItems.some(i => i.type === 'propfirm' && i.value === item.value)) {
            // Add related accounts if propfirm is selected
            return [...newItems, ...relatedAccounts.filter(account => 
              !newItems.some(i => i.type === 'account' && i.value === account.value)
            )]
          } else {
            // Remove related accounts if propfirm is deselected
            return newItems.filter(i => !(i.type === 'account' && relatedAccounts.some(account => account.value === i.value)))
          }
        }
      }

      return newItems
    })
  }, [allItems])

  const isItemDisabled = useCallback((item: FilterItem) => {
    if (item.type === 'instrument') {
      const selectedAccounts = selectedItems.filter(i => i.type === 'account').map(i => i.value)
      return selectedAccounts.length > 0 && !trades.some(trade => 
        selectedAccounts.includes(trade.accountNumber) && trade.instrument === item.value
      )
    }
    return false
  }, [selectedItems, trades])

  const handleSelectAll = useCallback((type: 'account' | 'instrument' | 'propfirm') => {
    setSelectedItems(prev => {
      const itemsOfType = allItems.filter(item => item.type === type)
      const availableItems = itemsOfType.filter(item => !isItemDisabled(item))
      const allAvailableSelected = availableItems.every(item => 
        prev.some(i => i.type === item.type && i.value === item.value)
      )
      
      if (allAvailableSelected) {
        return prev.filter(item => item.type !== type)
      } else {
        const newItems = availableItems.filter(item => 
          !prev.some(i => i.type === item.type && i.value === item.value)
        )
        return [...prev, ...newItems]
      }
    })
  }, [allItems, isItemDisabled])

  const isItemSelected = useCallback((item: FilterItem) => {
    return selectedItems.some(i => i.type === item.type && i.value === item.value)
  }, [selectedItems])

  const filteredItems = useMemo(() => 
    allItems.filter(item => 
      item.value.toLowerCase().includes(searchTerm.toLowerCase())
    ), [allItems, searchTerm]
  )

  const handleSelect = useCallback((selectedValue: string) => {
    const [type, value] = selectedValue.split(':') as ['account' | 'instrument' | 'propfirm', string]
    const item = { type, value }
    if (!isItemDisabled(item)) {
      handleItemChange(item)
    }
    setSearchTerm('')
  }, [handleItemChange, isItemDisabled])

  useEffect(() => {
    const newAccountNumbers = selectedItems
      .filter(item => item.type === 'account')
      .map(item => item.value)
    const newInstruments = selectedItems
      .filter(item => item.type === 'instrument')
      .map(item => item.value)
    const newPropfirms = selectedItems
      .filter(item => item.type === 'propfirm')
      .map(item => item.value)

    if (JSON.stringify(newAccountNumbers) !== JSON.stringify(accountNumbers)) {
      setAccountNumbers(newAccountNumbers)
    }
    if (JSON.stringify(newInstruments) !== JSON.stringify(instruments)) {
      setInstruments(newInstruments)
    }
    if (JSON.stringify(newPropfirms) !== JSON.stringify(propfirms)) {
      setPropfirms(newPropfirms)
    }
  }, [selectedItems, setAccountNumbers, setInstruments, accountNumbers, instruments, propfirms])

  const anonymizeAccount = (account: string) => {
    if (!showAccountNumbers) {
      return account.slice(0, 3) + '*'.repeat(account.length - 3)
    }
    return account
  }

  const FilterSection = ({ title, items, type }: { title: string, items: FilterItem[], type: 'account' | 'instrument' | 'propfirm' }) => {
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
          <ScrollArea className="h-[120px]">
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

  const FilterContent = useMemo(() => (
    <div className='space-y-4'>
      <h2 className="text-lg font-semibold mb-4" id="filter-heading">Filters</h2>
      <div className="mb-4 flex items-center justify-between">
        <Label htmlFor="anonymous-mode" className="text-sm font-medium">
          Show Account Numbers
        </Label>
        <Switch
          id="anonymous-mode"
          checked={showAccountNumbers}
          onCheckedChange={setShowAccountNumbers}
        />
      </div>
      <DateCalendarFilter />
      <Command className="rounded-lg border" shouldFilter={false}>
        <CommandInput
          placeholder="Search filters..."
          value={searchTerm}
          onValueChange={setSearchTerm}
          className={isMobile ? "text-lg" : ""}
        />
        <CommandList className='min-h-screen'>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            <FilterSection 
              title="Propfirms" 
              items={allItems.filter(item => item.type === 'propfirm')}
              type="propfirm"
            />
            <FilterSection 
              title="Accounts" 
              items={allItems.filter(item => item.type === 'account')}
              type="account"
            />
            <FilterSection 
              title="Instruments" 
              items={allItems.filter(item => item.type === 'instrument')}
              type="instrument"
            />
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  ), [allItems, handleSelect, handleSelectAll, isItemSelected, isItemDisabled, showAccountNumbers, anonymizeAccount, searchTerm, isMobile])

  if (isMobile) {
    return (
      <>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="fixed bottom-6 right-6 z-50" aria-label="Open filters">
              <Filter className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
            <ScrollArea className="h-full px-4 py-6">
              {FilterContent}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <div 
      ref={filterRef}
      className="fixed top-18 left-0 h-[calc(100vh-4.5rem)] w-[300px] border-r"
    >
      <ScrollArea className="h-full px-4 py-6">
        {FilterContent}
      </ScrollArea>
    </div>
  )
}