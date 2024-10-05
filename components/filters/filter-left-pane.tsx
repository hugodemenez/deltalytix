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
  type: 'account' | 'instrument'
  value: string
}

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

  useEffect(() => {
    const uniqueAccounts = Array.from(new Set(trades.map(trade => trade.accountNumber)))
    const uniqueInstruments = Array.from(new Set(trades.map(trade => trade.instrument)))
    
    setAllItems([
      ...uniqueAccounts.map(account => ({ type: 'account' as const, value: account })),
      ...uniqueInstruments.map(instrument => ({ type: 'instrument' as const, value: instrument }))
    ])
  }, [trades])

  useEffect(() => {
    setSelectedItems([
      ...accountNumbers.map(account => ({ type: 'account' as const, value: account })),
      ...instruments.map(instrument => ({ type: 'instrument' as const, value: instrument }))
    ])
  }, [accountNumbers, instruments])

  const handleItemChange = useCallback((item: FilterItem) => {
    setSelectedItems(prev => 
      prev.some(i => i.type === item.type && i.value === item.value)
        ? prev.filter(i => !(i.type === item.type && i.value === item.value))
        : [...prev, item]
    )
  }, [])

  const isItemDisabled = useCallback((item: FilterItem) => {
    if (item.type === 'instrument') {
      const selectedAccounts = selectedItems.filter(i => i.type === 'account').map(i => i.value)
      return selectedAccounts.length > 0 && !trades.some(trade => 
        selectedAccounts.includes(trade.accountNumber) && trade.instrument === item.value
      )
    }
    return false
  }, [selectedItems, trades])

  const handleSelectAll = useCallback((type: 'account' | 'instrument') => {
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
    const [type, value] = selectedValue.split(':') as ['account' | 'instrument', string]
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

    if (JSON.stringify(newAccountNumbers) !== JSON.stringify(accountNumbers)) {
      setAccountNumbers(newAccountNumbers)
    }
    if (JSON.stringify(newInstruments) !== JSON.stringify(instruments)) {
      setInstruments(newInstruments)
    }
  }, [selectedItems, setAccountNumbers, setInstruments, accountNumbers, instruments])

  const anonymizeAccount = (account: string) => {
    if (!showAccountNumbers) {
      return account.slice(0, 3) + '*'.repeat(account.length - 3)
    }
    return account
  }

  const FilterSection = ({ title, items, type }: { title: string, items: FilterItem[], type: 'account' | 'instrument' }) => {
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
    <div className='py-4 lg:py-6 space-y-4'>
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
      <Command className="rounded-lg border overflow-y-auto" shouldFilter={false}>
        <CommandInput
          placeholder="Search filters..."
          value={searchTerm}
          onValueChange={setSearchTerm}
          className={isMobile ? "text-lg" : ""}
        />
        <CommandList className="overflow-y-hidden min-h-[500px]">
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
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

  useEffect(() => {
    const filterElement = filterRef.current
    if (filterElement && !isMobile) {
      filterElement.addEventListener('mouseenter', disableScroll)
      filterElement.addEventListener('mouseleave', enableScroll)

      return () => {
        filterElement.removeEventListener('mouseenter', disableScroll)
        filterElement.removeEventListener('mouseleave', enableScroll)
      }
    }
  }, [disableScroll, enableScroll, isMobile])

  if (isMobile) {
    return (
      <>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="fixed bottom-6 right-6 z-50" aria-label="Open filters">
              <Filter className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            {FilterContent}
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <div 
      ref={filterRef}
      className="px-4 fixed top-18 left-0 h-full min-w-[300px] overflow-y-auto"
    >
      {FilterContent}
    </div>
  )
}