'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronsUpDown } from "lucide-react"
import { useData } from '@/context/data-provider'
import { useTradesStore } from '../../../../../store/trades-store'

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
  { name: 'Other', prefix: '' },
]

export default function NavbarFilters() {
  const { accountNumbers, setAccountNumbers, instruments, setInstruments } = useData()
  const trades = useTradesStore(state => state.trades)
  
  const [allItems, setAllItems] = useState<FilterItem[]>([])
  const [selectedItems, setSelectedItems] = useState<FilterItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [propfirms, setPropfirms] = useState<string[]>([])

  useEffect(() => {
    if (trades && trades.length > 0) {
      const uniqueAccounts = Array.from(new Set(trades.map(trade => trade.accountNumber || '')))
      const uniqueInstruments = Array.from(new Set(trades.map(trade => trade.instrument || '')))
      const uniquePropfirms = Array.from(new Set(uniqueAccounts.map(account => {
        const propfirm = propfirmGroups.find(group => account.startsWith(group.prefix))
        return propfirm ? propfirm.name : 'Other'
      })))
      
      setAllItems([
        ...uniqueAccounts.map(account => ({ type: 'account' as const, value: account })),
        ...uniqueInstruments.map(instrument => ({ type: 'instrument' as const, value: instrument })),
        ...uniquePropfirms.map(propfirm => ({ type: 'propfirm' as const, value: propfirm }))
      ])
    } else {
      setAllItems([])
    }
  }, [trades])

  useEffect(() => {
    setSelectedItems([
      ...(accountNumbers || []).map(account => ({ type: 'account' as const, value: account })),
      ...(instruments || []).map(instrument => ({ type: 'instrument' as const, value: instrument })),
      ...(propfirms || []).map(propfirm => ({ type: 'propfirm' as const, value: propfirm }))
    ])
  }, [accountNumbers, instruments, propfirms])

  const handleItemChange = useCallback((item: FilterItem) => {
    setSelectedItems(prev => {
      const newItems = prev.some(i => i.type === item.type && i.value === item.value)
        ? prev.filter(i => !(i.type === item.type && i.value === item.value))
        : [...prev, item]

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
            return [...newItems, ...relatedAccounts.filter(account => 
              !newItems.some(i => i.type === 'account' && i.value === account.value)
            )]
          } else {
            return newItems.filter(i => !(i.type === 'account' && relatedAccounts.some(account => account.value === i.value)))
          }
        }
      }

      return newItems
    })
  }, [allItems])

  const isItemSelected = useCallback((item: FilterItem) => {
    return selectedItems.some(i => i.type === item.type && i.value === item.value)
  }, [selectedItems])

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

  const FilterButton = ({ type, label }: { type: 'account' | 'instrument' | 'propfirm', label: string }) => {
    const [open, setOpen] = useState(false)
    const items = allItems.filter(item => item.type === type)

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={`Select ${type}`}
            className="w-[200px] justify-between"
          >
            {label}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder={`Search ${type}...`} onValueChange={setSearchTerm} />
            <CommandList>
            <CommandEmpty>No {type} found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-[200px]">
                {items.map((item) => (
                  <CommandItem
                    key={item.value}
                    onSelect={() => handleItemChange(item)}
                  >
                    <Checkbox
                      checked={isItemSelected(item)}
                      className="mr-2"
                    />
                    {item.value}
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div className="flex space-x-2">
      <FilterButton type="account" label="Select account" />
      <FilterButton type="instrument" label="Select instrument" />
      <FilterButton type="propfirm" label="Select propfirm" />
    </div>
  )
}