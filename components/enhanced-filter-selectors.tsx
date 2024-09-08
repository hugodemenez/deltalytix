'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useTrades, useFormattedTrades } from './context/trades-data'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Calendar } from "@/components/ui/calendar"
import { Search, X, Calendar as CalendarIcon } from "lucide-react"
import { Trade } from '@prisma/client'
import { subDays, startOfYear } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { useMediaQuery } from '@/hooks/use-media-query'

interface DateRange {
  from: Date
  to: Date
}

interface Filter {
  type: 'accountNumber' | 'instrument' | 'dateRange'
  value: string
}

const quickSelectOptions = [
  { label: 'Last 7 days', value: 'last7Days' },
  { label: 'Last 30 days', value: 'last30Days' },
  { label: 'Last 3 months', value: 'last3Months' },
  { label: 'Year to Date', value: 'yearToDate' },
  { label: 'Last 12 months', value: 'last12Months' },
  { label: 'All Time', value: 'allTime' },
]

export function EnhancedFilterSelectors() {
  const { trades } = useTrades()
  const { accountNumbers, setAccountNumbers, instruments, setInstruments, dateRange, setDateRange } = useFormattedTrades()
  const [activeFilters, setActiveFilters] = useState<Filter[]>([])
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const commandRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isMobile = useMediaQuery('(max-width: 768px)')

  const uniqueAccounts = Array.from(new Set(trades.map(trade => trade.accountNumber)))
  const uniqueInstruments = Array.from(new Set(trades.map(trade => trade.instrument)))

  const handleDateSelect = useCallback((value: string) => {
    const today = new Date()
    let from: Date
    let to: Date = today
    let label: string

    switch (value) {
      case 'last7Days':
        from = subDays(today, 7)
        label = 'Last 7 days'
        break
      case 'last30Days':
        from = subDays(today, 30)
        label = 'Last 30 days'
        break
      case 'last3Months':
        from = subDays(today, 90)
        label = 'Last 3 months'
        break
      case 'yearToDate':
        from = startOfYear(today)
        label = 'Year to Date'
        break
      case 'last12Months':
        from = subDays(today, 365)
        label = 'Last 12 months'
        break
      case 'allTime':
        from = new Date(0)
        label = 'All Time'
        break
      default:
        return
    }

    setDateRange({ from, to })
    setActiveFilters(prev => [...prev.filter(f => f.type !== 'dateRange'), { type: 'dateRange', value: label }])
  }, [setDateRange])
  const handleSelect = useCallback((selectedValue: string) => {
    if (selectedValue.startsWith('account:')) {
      const account = selectedValue.split(':')[1]
      setAccountNumbers(prev => 
        prev.includes(account) ? prev.filter(a => a !== account) : [...prev, account]
      )
      setActiveFilters(prev => 
        prev.some(f => f.type === 'accountNumber' && f.value === account)
          ? prev.filter(f => !(f.type === 'accountNumber' && f.value === account))
          : [...prev, { type: 'accountNumber', value: account }]
      )
    } else if (selectedValue.startsWith('instrument:')) {
      const instrument = selectedValue.split(':')[1]
      setInstruments(prev => 
        prev.includes(instrument) ? prev.filter(i => i !== instrument) : [...prev, instrument]
      )
      setActiveFilters(prev => 
        prev.some(f => f.type === 'instrument' && f.value === instrument)
          ? prev.filter(f => !(f.type === 'instrument' && f.value === instrument))
          : [...prev, { type: 'instrument', value: instrument }]
      )
    } else {
      handleDateSelect(selectedValue)
    }
    setInputValue('')
    inputRef.current?.focus()
  }, [handleDateSelect, setAccountNumbers, setInstruments])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const CommandContent = React.useMemo(() => (
    <Command className={`rounded-lg border relative overflow-visible h-12 ${open ? 'rounded-b-none' : ''}`} ref={commandRef}>
      <CommandInput
      className='text-lg'
        onFocus={() => setOpen(true)}
        ref={inputRef}
        placeholder="Type to filter..."
        value={inputValue}
        onValueChange={setInputValue}
      />
      <AnimatePresence>
        {open && (
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
                {uniqueAccounts
                  .filter(account => account.toLowerCase().includes(inputValue.toLowerCase()))
                  .map(account => (
                    <CommandItem key={account} onSelect={() => handleSelect(`account:${account}`)} className="transition-none">
                      {account}
                      {accountNumbers.includes(account) && <span className="ml-auto">✓</span>}
                    </CommandItem>
                  ))
                }
              </CommandGroup>
              <CommandGroup heading="Instruments">
                {uniqueInstruments
                  .filter(instrument => instrument.toLowerCase().includes(inputValue.toLowerCase()))
                  .map(instrument => (
                    <CommandItem key={instrument} onSelect={() => handleSelect(`instrument:${instrument}`)} className="transition-none">
                      {instrument}
                      {instruments.includes(instrument) && <span className="ml-auto">✓</span>}
                    </CommandItem>
                  ))
                }
              </CommandGroup>
              <CommandGroup heading="Date Range">
                {quickSelectOptions
                  .filter(option => option.label.toLowerCase().includes(inputValue.toLowerCase()))
                  .map(option => (
                    <CommandItem key={option.value} onSelect={() => handleSelect(option.value)} className="transition-none">
                      {option.label}
                      {activeFilters.some(f => f.type === 'dateRange' && f.value === option.label) && <span className="ml-auto">✓</span>}
                    </CommandItem>
                  ))
                }
              </CommandGroup>
            </CommandList>
          </motion.div>
        )}
      </AnimatePresence>
    </Command>
  ), [open, inputValue, uniqueAccounts, uniqueInstruments, accountNumbers, instruments, activeFilters, handleSelect])

  return (
    <div className="flex gap-x-4 items-center justify-center h-fit">
      {CommandContent}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-fit justify-start text-left font-normal h-12 text-muted-foreground">
            <CalendarIcon className="sm:mr-2 h-4 w-4 shrink-0" />
            {!isMobile && (dateRange ? `${dateRange.from!.toDateString()} - ${dateRange.to!.toDateString()}` : "Select date range")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={dateRange}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                setDateRange({ from: range.from, to: range.to })
                setActiveFilters(prev => [
                  ...prev.filter(f => f.type !== 'dateRange'),
                  { type: 'dateRange', value: `${range.from!.toDateString()} - ${range.to!.toDateString()}` }
                ])
              }
              setCalendarOpen(false)
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}