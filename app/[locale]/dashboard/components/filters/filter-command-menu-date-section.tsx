"use client"

import { useState } from "react"
import { CalendarIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useData } from "@/context/data-provider"
import { useI18n } from "@/locales/client"
import { useParams } from "next/navigation"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { fr } from 'date-fns/locale'
import { cn } from "@/lib/utils"

interface DateRangeSectionProps {
  searchValue: string
}

export function DateRangeSection({ searchValue }: DateRangeSectionProps) {
  const { dateRange, setDateRange } = useData()
  const [fromCalendarOpen, setFromCalendarOpen] = useState(false)
  const [toCalendarOpen, setToCalendarOpen] = useState(false)
  const t = useI18n()
  const params = useParams()
  const locale = params.locale as string
  const dateLocale = locale === 'fr' ? fr : undefined

  const handleFromSelect = (date: Date | undefined) => {
    if (date) {
      setDateRange({ from: date, to: dateRange?.to })
    }
    setFromCalendarOpen(false)
  }

  const handleToSelect = (date: Date | undefined) => {
    if (date) {
      setDateRange({ from: dateRange?.from, to: date })
    }
    setToCalendarOpen(false)
  }

  const formatDate = (date: Date) => {
    return format(date, "LLL dd, y", { locale: dateLocale })
  }

  const quickSelectors = [
    { label: t('filters.thisWeek'), getRange: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }) },
    { label: t('filters.thisMonth'), getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { label: t('filters.lastThreeMonths'), getRange: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
    { label: t('filters.lastSixMonths'), getRange: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
  ]

  // Filter quick selectors based on search
  const filteredQuickSelectors = searchValue
    ? quickSelectors.filter(selector => 
        selector.label.toLowerCase().includes(searchValue.toLowerCase())
      )
    : quickSelectors

  // Filter "from" and "to" labels based on search
  const fromLabel = t('filters.commandMenu.dateRange.from')
  const toLabel = t('filters.commandMenu.dateRange.to')
  const showFrom = !searchValue || fromLabel.toLowerCase().includes(searchValue.toLowerCase())
  const showTo = !searchValue || toLabel.toLowerCase().includes(searchValue.toLowerCase())

  return (
    <>
      {/* From Date Calendar Popover */}
      {showFrom && (
        <Popover open={fromCalendarOpen} onOpenChange={setFromCalendarOpen}>
          <PopoverTrigger asChild>
            <CommandItem
              onSelect={() => {
                setFromCalendarOpen(true)
              }}
              className="flex items-center gap-2 px-2 group"
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="text-sm">{fromLabel}</span>
              <div className="ml-auto flex items-center gap-1.5">
                <span className={cn(
                  "text-xs text-muted-foreground min-w-[100px] text-right",
                  !dateRange?.from && "invisible"
                )}>
                  {dateRange?.from ? formatDate(dateRange.from) : "\u00A0"}
                </span>
                {dateRange?.from && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDateRange({ from: undefined, to: dateRange?.to })
                    }}
                  >
                    <X className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            </CommandItem>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4">
              <Calendar
                initialFocus
                mode="single"
                defaultMonth={dateRange?.from}
                selected={dateRange?.from}
                onSelect={handleFromSelect}
                className="rounded-md border"
                locale={dateLocale}
              />
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* To Date Calendar Popover */}
      {showTo && (
        <Popover open={toCalendarOpen} onOpenChange={setToCalendarOpen}>
          <PopoverTrigger asChild>
            <CommandItem
              onSelect={() => {
                setToCalendarOpen(true)
              }}
              className="flex items-center gap-2 px-2 group"
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="text-sm">{toLabel}</span>
              <div className="ml-auto flex items-center gap-1.5">
                <span className={cn(
                  "text-xs text-muted-foreground min-w-[100px] text-right",
                  !dateRange?.to && "invisible"
                )}>
                  {dateRange?.to ? formatDate(dateRange.to) : "\u00A0"}
                </span>
                {dateRange?.to && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDateRange({ from: dateRange?.from, to: undefined })
                    }}
                  >
                    <X className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            </CommandItem>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4">
              <Calendar
                initialFocus
                mode="single"
                defaultMonth={dateRange?.to || dateRange?.from}
                selected={dateRange?.to}
                onSelect={handleToSelect}
                className="rounded-md border"
                locale={dateLocale}
              />
            </div>
          </PopoverContent>
        </Popover>
      )}


      {/* Quick Selectors */}
      {filteredQuickSelectors.map((selector, index) => (
        <CommandItem
          key={index}
          onSelect={() => {
            const range = selector.getRange()
            setDateRange(range)
          }}
          className="px-2"
        >
          <span className="text-sm">{selector.label}</span>
        </CommandItem>
      ))}
    </>
  )
}

