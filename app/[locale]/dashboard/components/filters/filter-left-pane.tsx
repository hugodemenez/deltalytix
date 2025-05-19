'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Filter } from "lucide-react"
import { useMediaQuery } from '@/hooks/use-media-query'
import { Switch } from "@/components/ui/switch"
import DateCalendarFilter from './date-calendar-filter'
import { useUserData } from '@/components/context/user-data'
import { FilterSection } from './filter-selection'
import { FilterItem, PropfirmGroup } from '@/app/[locale]/dashboard/types/filter'
import { useI18n } from "@/locales/client"

const propfirmGroups: PropfirmGroup[] = [
  { name: 'FastTrackTrading', prefix: 'FTT' },
  { name: 'Phidias', prefix: 'PP' },
  { name: 'Bulenox', prefix: 'BX' },
  { name: 'Other', prefix: '' }, // Add 'Other' to the propfirmGroups
]

export default function FilterLeftPane() {
  const { accountNumbers, setAccountNumbers, instruments, setInstruments, trades } = useUserData()
  const t = useI18n()
  
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
            .filter(i => i.type === 'account' && (
              propfirmGroup.name === 'Other' 
                ? !propfirmGroups.some(g => g.name !== 'Other' && i.value.startsWith(g.prefix))
                : i.value.startsWith(propfirmGroup.prefix)
            ))
          
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

    const timer = setTimeout(() => {
      if (JSON.stringify(newAccountNumbers) !== JSON.stringify(accountNumbers)) {
        setAccountNumbers(newAccountNumbers)
      }
      if (JSON.stringify(newInstruments) !== JSON.stringify(instruments)) {
        setInstruments(newInstruments)
      }
      if (JSON.stringify(newPropfirms) !== JSON.stringify(propfirms)) {
        setPropfirms(newPropfirms)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [selectedItems, accountNumbers, instruments, propfirms, setAccountNumbers, setInstruments, setPropfirms])

  const anonymizeAccount = useCallback((account: string) => {
    if (!showAccountNumbers) {
      return account.slice(0, 3) + '*'.repeat(account.length - 3)
    }
    return account
  }, [showAccountNumbers])

  const FilterContent = useMemo(() => (
    <div className='space-y-6'>
      <DateCalendarFilter />
      <div className="flex items-center justify-between">
        <Label htmlFor="anonymous-mode" className="text-sm font-medium">
          {t('filters.showAccountNumbers')}
        </Label>
        <Switch
          id="anonymous-mode"
          checked={showAccountNumbers}
          onCheckedChange={setShowAccountNumbers}
        />
      </div>
      <Command className="rounded-lg border min-h-[calc(100vh-20rem)]" shouldFilter={false}>
        <div className="border-b">
          <CommandInput
            placeholder={t('filters.search')}
            value={searchTerm}
            onValueChange={setSearchTerm}
            className={`${isMobile ? "text-lg" : ""}`}
          />
        </div>
        <CommandList className="min-h-[calc(100vh-20rem)]">
          <CommandEmpty>{t('filters.noResults')}</CommandEmpty>
          <CommandGroup className="divide-y">
            <FilterSection 
              items={allItems.filter(item => item.type === 'account')}
              type="account"
              searchTerm={searchTerm}
              handleSelect={handleSelect}
              isItemDisabled={isItemDisabled}
              isItemSelected={isItemSelected}
              handleSelectAll={handleSelectAll}
              anonymizeAccount={anonymizeAccount}
            />
            <FilterSection 
              items={allItems.filter(item => item.type === 'propfirm')}
              type="propfirm"
              searchTerm={searchTerm}
              handleSelect={handleSelect}
              isItemDisabled={isItemDisabled}
              isItemSelected={isItemSelected}
              handleSelectAll={handleSelectAll}
              anonymizeAccount={anonymizeAccount}
            />
            <FilterSection 
              items={allItems.filter(item => item.type === 'instrument')}
              type="instrument"
              searchTerm={searchTerm}
              handleSelect={handleSelect}
              isItemDisabled={isItemDisabled}
              isItemSelected={isItemSelected}
              handleSelectAll={handleSelectAll}
              anonymizeAccount={anonymizeAccount}
            />
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  ), [allItems, showAccountNumbers, searchTerm, isMobile, handleSelect, isItemDisabled, isItemSelected, handleSelectAll, anonymizeAccount, t])

  if (isMobile) {
    return (
      <>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="h-10 w-10 p-0 rounded-full flex items-center justify-center transition-transform active:scale-95"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[90vw] sm:max-w-[640px] flex flex-col h-[100dvh] overflow-hidden">
            <SheetHeader>
              <SheetTitle>{t('filters.title')}</SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1 mt-6">
              {FilterContent}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return null;
}
