'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTrades, useFormattedTrades } from '../context/trades-data'
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { X, Filter, Eye, EyeOff } from "lucide-react"
import { useMediaQuery } from '@/hooks/use-media-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Switch } from "@/components/ui/switch"

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
  const [commandOpen, setCommandOpen] = useState(false)
  const [showAccountNumbers, setShowAccountNumbers] = useState(true)
  const commandRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")

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
    inputRef.current?.focus()
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(event.target as Node)) {
        setCommandOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const anonymizeAccount = (account: string) => {
    if (!showAccountNumbers) {
      return account.slice(0, 3) + '*'.repeat(account.length - 3)
    }
    return account
  }

  const CommandContent = useMemo(() => (
    <Command className={`rounded-lg border relative overflow-visible h-12 ${commandOpen ? 'rounded-b-none' : ''}`} ref={commandRef}>
      <CommandInput
        className='text-lg sm:text-sm'
        onFocus={() => setCommandOpen(true)}
        ref={inputRef}
        placeholder="Search filters..."
        value={searchTerm}
        onValueChange={setSearchTerm}
      />
      <AnimatePresence>
        {commandOpen && (
          <motion.div
            key="command-list"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className='absolute top-12 bg-background w-full border border-t-0 rounded-b-lg left-0 z-10'
          >
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Accounts">
                {filteredItems
                  .filter(item => item.type === 'account')
                  .map(item => (
                    <CommandItem 
                      key={item.value} 
                      onSelect={() => handleSelect(`account:${item.value}`)} 
                      className={`transition-none ${isItemDisabled(item) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={isItemDisabled(item)}
                    >
                      <Checkbox checked={isItemSelected(item)} className="mr-2" disabled={isItemDisabled(item)} />
                      {anonymizeAccount(item.value)}
                    </CommandItem>
                  ))
                }
              </CommandGroup>
              <CommandGroup heading="Instruments">
                {filteredItems
                  .filter(item => item.type === 'instrument')
                  .map(item => (
                    <CommandItem 
                      key={item.value} 
                      onSelect={() => handleSelect(`instrument:${item.value}`)} 
                      className={`transition-none ${isItemDisabled(item) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={isItemDisabled(item)}
                    >
                      <Checkbox checked={isItemSelected(item)} className="mr-2" disabled={isItemDisabled(item)} />
                      {item.value}
                    </CommandItem>
                  ))
                }
              </CommandGroup>
            </CommandList>
          </motion.div>
        )}
      </AnimatePresence>
    </Command>
  ), [commandOpen, searchTerm, filteredItems, handleSelect, isItemSelected, isItemDisabled, showAccountNumbers])

  const FilterContent = useMemo(() => (
    <div className='py-4 lg:py-6'>
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

      <div className="mb-4">
        {CommandContent}
      </div>
      
      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-4">
          <div>
            <div className="flex items-center mb-2">
              <Checkbox 
                id="select-all-accounts"
                checked={allItems.filter(item => item.type === 'account' && !isItemDisabled(item)).every(item => isItemSelected(item))}
                onCheckedChange={() => handleSelectAll('account')}
              />
              <Label htmlFor="select-all-accounts" className="ml-2 font-semibold">
                Accounts
              </Label>
            </div>
            {allItems
              .filter(item => item.type === 'account')
              .map(item => (
                <div key={item.value} className="flex items-center mb-2 ml-4">
                  <Checkbox 
                    id={`item-${item.value}`}
                    checked={isItemSelected(item)}
                    onCheckedChange={() => handleItemChange(item)}
                    disabled={isItemDisabled(item)}
                  />
                  <Label 
                    htmlFor={`item-${item.value}`} 
                    className={`ml-2 ${isItemDisabled(item) ? 'opacity-50' : ''}`}
                  >
                    {anonymizeAccount(item.value)}
                  </Label>
                </div>
              ))
            }
          </div>
          <div>
            <div className="flex items-center mb-2">
              <Checkbox 
                id="select-all-instruments"
                checked={allItems.filter(item => item.type === 'instrument' && !isItemDisabled(item)).every(item => isItemSelected(item))}
                onCheckedChange={() => handleSelectAll('instrument')}
              />
              <Label htmlFor="select-all-instruments" className="ml-2 font-semibold">
                Instruments
              </Label>
            </div>
            {allItems
              .filter(item => item.type === 'instrument')
              .map(item => (
                <div key={item.value} className="flex items-center mb-2 ml-4">
                  <Checkbox 
                    id={`item-${item.value}`}
                    checked={isItemSelected(item)}
                    onCheckedChange={() => handleItemChange(item)}
                    disabled={isItemDisabled(item)}
                  />
                  <Label 
                    htmlFor={`item-${item.value}`} 
                    className={`ml-2 ${isItemDisabled(item) ? 'opacity-50' : ''}`}
                  >
                    {item.value}
                  </Label>
                </div>
              ))
            }
          </div>
        </div>
      </ScrollArea>
    </div>
  ), [CommandContent, allItems, isItemSelected, isItemDisabled, handleSelectAll, handleItemChange, showAccountNumbers])

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
    <div className="md:block fixed left-0 top-0 w-64 h-screen bg-background border-r p-4 flex flex-col overflow-hidden" aria-labelledby="filter-heading">
      <div className="h-16" /> {/* Space for the Navbar */}
      {FilterContent}
    </div>
  )
}