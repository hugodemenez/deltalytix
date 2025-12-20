"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useData } from "@/context/data-provider"
import { useI18n } from "@/locales/client"
import { useParams } from "next/navigation"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isValid, getYear, getMonth, getDate, set } from "date-fns"
import { fr } from 'date-fns/locale'
import { cn } from "@/lib/utils"

interface DateRangeSectionProps {
  searchValue: string
}

interface DateInputsState {
  year: string
  month: string
  day: string
}

export function DateRangeSection({ searchValue }: DateRangeSectionProps) {
  const { dateRange, setDateRange, weekdayFilter, setWeekdayFilter } = useData()
  const [fromCalendarOpen, setFromCalendarOpen] = useState(false)
  const [toCalendarOpen, setToCalendarOpen] = useState(false)
  const [uniqueDayCalendarOpen, setUniqueDayCalendarOpen] = useState(false)
  
  // Helper to get today's date inputs (year and month only)
  const getTodayInputs = (): DateInputsState => {
    const today = new Date()
    return {
      year: getYear(today).toString(),
      month: (getMonth(today) + 1).toString().padStart(2, '0'),
      day: "", // Day is selected from calendar
    }
  }
  
  // Input states for each calendar - default to today (year and month only)
  const [fromInputs, setFromInputs] = useState<DateInputsState>(() => {
    if (dateRange?.from) {
      return {
        year: getYear(dateRange.from).toString(),
        month: (getMonth(dateRange.from) + 1).toString().padStart(2, '0'),
        day: "", // Day is selected from calendar
      }
    }
    return getTodayInputs()
  })
  const [toInputs, setToInputs] = useState<DateInputsState>(() => {
    if (dateRange?.to) {
      return {
        year: getYear(dateRange.to).toString(),
        month: (getMonth(dateRange.to) + 1).toString().padStart(2, '0'),
        day: "", // Day is selected from calendar
      }
    }
    return getTodayInputs()
  })
  const [uniqueDayInputs, setUniqueDayInputs] = useState<DateInputsState>(() => {
    if (dateRange?.from && dateRange?.to && dateRange.from.getTime() === dateRange.to.getTime()) {
      return {
        year: getYear(dateRange.from).toString(),
        month: (getMonth(dateRange.from) + 1).toString().padStart(2, '0'),
        day: "", // Day is selected from calendar
      }
    }
    return getTodayInputs()
  })
  
  // Calendar month states for controlled navigation
  const [fromCalendarMonth, setFromCalendarMonth] = useState<Date | undefined>(dateRange?.from || new Date())
  const [toCalendarMonth, setToCalendarMonth] = useState<Date | undefined>(dateRange?.to || dateRange?.from || new Date())
  const [uniqueDayCalendarMonth, setUniqueDayCalendarMonth] = useState<Date | undefined>(dateRange?.from || dateRange?.to || new Date())
  
  const t = useI18n()
  const params = useParams()
  const locale = params.locale as string
  const dateLocale = locale === 'fr' ? fr : undefined

  // Sync inputs with date range changes (year and month only)
  useEffect(() => {
    if (dateRange?.from) {
      setFromInputs({
        year: getYear(dateRange.from).toString(),
        month: (getMonth(dateRange.from) + 1).toString().padStart(2, '0'),
        day: "", // Day is selected from calendar
      })
      setFromCalendarMonth(dateRange.from)
    } else {
      // Default to today when no date is set
      const todayInputs = getTodayInputs()
      setFromInputs(todayInputs)
      setFromCalendarMonth(new Date())
    }
  }, [dateRange?.from])

  useEffect(() => {
    if (dateRange?.to) {
      setToInputs({
        year: getYear(dateRange.to).toString(),
        month: (getMonth(dateRange.to) + 1).toString().padStart(2, '0'),
        day: "", // Day is selected from calendar
      })
      setToCalendarMonth(dateRange.to)
    } else {
      // Default to today when no date is set
      const todayInputs = getTodayInputs()
      setToInputs(todayInputs)
      setToCalendarMonth(new Date())
    }
  }, [dateRange?.to])

  useEffect(() => {
    if (dateRange?.from && dateRange?.to && dateRange.from.getTime() === dateRange.to.getTime()) {
      setUniqueDayInputs({
        year: getYear(dateRange.from).toString(),
        month: (getMonth(dateRange.from) + 1).toString().padStart(2, '0'),
        day: "", // Day is selected from calendar
      })
      setUniqueDayCalendarMonth(dateRange.from)
    } else {
      // Default to today when no date is set
      const todayInputs = getTodayInputs()
      setUniqueDayInputs(todayInputs)
      setUniqueDayCalendarMonth(new Date())
    }
  }, [dateRange?.from, dateRange?.to])

  const createDateFromInputs = (inputs: DateInputsState): Date | null => {
    const year = parseInt(inputs.year)
    const month = parseInt(inputs.month)

    // Only require year and month - day will be selected from calendar
    if (!inputs.year || !inputs.month) {
      return null
    }

    if (isNaN(year) || isNaN(month)) {
      return null
    }

    // Validate ranges
    if (year < 1900 || year > 2100) return null
    if (month < 1 || month > 12) return null

    try {
      // Return first day of the month - user will select specific day from calendar
      const date = set(new Date(), { year, month: month - 1, date: 1, hours: 12, minutes: 0, seconds: 0, milliseconds: 0 })
      if (isValid(date) && getYear(date) === year && getMonth(date) === month - 1) {
        return date
      }
    } catch {
      return null
    }

    return null
  }

  const handleFromInputChange = (field: keyof DateInputsState, value: string) => {
    const newInputs = { ...fromInputs, [field]: value }
    setFromInputs(newInputs)
    
    // Update calendar month when year or month changes
    if (field === 'year' || field === 'month') {
      const year = field === 'year' ? parseInt(value) : parseInt(newInputs.year)
      const month = field === 'month' ? parseInt(value) : parseInt(newInputs.month)
      if (!isNaN(year) && !isNaN(month) && year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
        const monthDate = set(new Date(), { year, month: month - 1, date: 1 })
        setFromCalendarMonth(monthDate)
      }
    }
    
    // Only navigate calendar - don't set date range until user selects day from calendar
    const monthDate = createDateFromInputs(newInputs)
    if (monthDate) {
      setFromCalendarMonth(monthDate)
    }
  }

  const handleToInputChange = (field: keyof DateInputsState, value: string) => {
    const newInputs = { ...toInputs, [field]: value }
    setToInputs(newInputs)
    
    // Update calendar month when year or month changes
    if (field === 'year' || field === 'month') {
      const year = field === 'year' ? parseInt(value) : parseInt(newInputs.year)
      const month = field === 'month' ? parseInt(value) : parseInt(newInputs.month)
      if (!isNaN(year) && !isNaN(month) && year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
        const monthDate = set(new Date(), { year, month: month - 1, date: 1 })
        setToCalendarMonth(monthDate)
      }
    }
    
    // Only navigate calendar - don't set date range until user selects day from calendar
    const monthDate = createDateFromInputs(newInputs)
    if (monthDate) {
      setToCalendarMonth(monthDate)
    }
  }

  const handleUniqueDayInputChange = (field: keyof DateInputsState, value: string) => {
    const newInputs = { ...uniqueDayInputs, [field]: value }
    setUniqueDayInputs(newInputs)
    
    // Update calendar month when year or month changes
    if (field === 'year' || field === 'month') {
      const year = field === 'year' ? parseInt(value) : parseInt(newInputs.year)
      const month = field === 'month' ? parseInt(value) : parseInt(newInputs.month)
      if (!isNaN(year) && !isNaN(month) && year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
        const monthDate = set(new Date(), { year, month: month - 1, date: 1 })
        setUniqueDayCalendarMonth(monthDate)
      }
    }
    
    // Only navigate calendar - don't set date range until user selects day from calendar
    const monthDate = createDateFromInputs(newInputs)
    if (monthDate) {
      setUniqueDayCalendarMonth(monthDate)
    }
  }

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

  const handleUniqueDaySelect = (date: Date | undefined) => {
    if (date) {
      setDateRange({ from: date, to: date })
    }
    setUniqueDayCalendarOpen(false)
  }

  const formatDate = (date: Date) => {
    return format(date, "LLL dd, y", { locale: dateLocale })
  }

  // Generate year options (current year to 1900, then 2100 to current year + 1)
  const currentYear = new Date().getFullYear()
  const yearsBefore = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i)
  const yearsAfter = Array.from({ length: 2100 - currentYear }, (_, i) => currentYear + i + 1)
  const yearOptions = [...yearsBefore, ...yearsAfter]

  // Generate month options with localized names
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const monthDate = set(new Date(), { year: 2000, month: i, date: 1 })
    return {
      value: (i + 1).toString(),
      label: format(monthDate, "MMMM", { locale: dateLocale })
    }
  })

  // Date Inputs Component
  const DateInputs = ({ 
    inputs, 
    onChange,
    prefix = ""
  }: { 
    inputs: DateInputsState
    onChange: (field: keyof DateInputsState, value: string) => void
    prefix?: string
  }) => {
    return (
      <div className="space-y-3 border-b pb-3 mb-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t('filters.commandMenu.dateRange.year')}
            </Label>
            <Select
              value={inputs.year || undefined}
              onValueChange={(value) => onChange('year', value)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t('filters.commandMenu.dateRange.placeholderYear')} />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t('filters.commandMenu.dateRange.month')}
            </Label>
            <Select
              value={inputs.month || undefined}
              onValueChange={(value) => onChange('month', value)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t('filters.commandMenu.dateRange.placeholderMonth')} />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    )
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
  const uniqueDayLabel = t('filters.uniqueDay')
  const showFrom = !searchValue || fromLabel.toLowerCase().includes(searchValue.toLowerCase())
  const showTo = !searchValue || toLabel.toLowerCase().includes(searchValue.toLowerCase())
  const showUniqueDay = !searchValue || uniqueDayLabel.toLowerCase().includes(searchValue.toLowerCase())

  // Get weekday name for display
  const getWeekdayName = (day: number): string => {
    const weekdayNames = [
      t('weekdayPnl.days.sunday'),
      t('weekdayPnl.days.monday'),
      t('weekdayPnl.days.tuesday'),
      t('weekdayPnl.days.wednesday'),
      t('weekdayPnl.days.thursday'),
      t('weekdayPnl.days.friday'),
      t('weekdayPnl.days.saturday'),
    ]
    return weekdayNames[day] || ''
  }

  const showWeekdayFilter = weekdayFilter?.days && weekdayFilter.days.length > 0

  // Format weekday filter display
  const formatWeekdayFilter = () => {
    if (!weekdayFilter?.days || weekdayFilter.days.length === 0) return ''
    if (weekdayFilter.days.length === 1) {
      return getWeekdayName(weekdayFilter.days[0])
    }
    // Sort days for consistent display
    const sortedDays = [...weekdayFilter.days].sort((a, b) => a - b)
    return sortedDays.map(day => getWeekdayName(day)).join(', ')
  }

  return (
    <>
      {/* Weekday Filter Indicator */}
      {showWeekdayFilter && (
        <CommandItem
          onSelect={() => setWeekdayFilter({ days: [] })}
          className="flex items-center gap-2 px-2 group"
        >
          <CalendarIcon className="h-4 w-4" />
          <span className="text-sm">{t('filters.commandMenu.dateRange.weekdayFilter')}: {formatWeekdayFilter()}</span>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                setWeekdayFilter({ days: [] })
              }}
            >
              <X className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </CommandItem>
      )}

      {/* From Date Calendar Popover */}
      {showFrom && (
        <Popover open={fromCalendarOpen} onOpenChange={setFromCalendarOpen}>
          <PopoverTrigger asChild>
            <CommandItem
              onSelect={() => {
                // Initialize calendar month if not set
                if (!fromCalendarMonth) {
                  setFromCalendarMonth(dateRange?.from || new Date())
                }
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
              <DateInputs inputs={fromInputs} onChange={handleFromInputChange} prefix="from-" />
              <Calendar
                initialFocus
                mode="single"
                month={fromCalendarMonth}
                onMonthChange={setFromCalendarMonth}
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
                // Initialize calendar month if not set
                if (!toCalendarMonth) {
                  setToCalendarMonth(dateRange?.to || dateRange?.from || new Date())
                }
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
              <DateInputs inputs={toInputs} onChange={handleToInputChange} prefix="to-" />
              <Calendar
                initialFocus
                mode="single"
                month={toCalendarMonth}
                onMonthChange={setToCalendarMonth}
                selected={dateRange?.to}
                onSelect={handleToSelect}
                className="rounded-md border"
                locale={dateLocale}
              />
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Unique Day Calendar Popover */}
      {showUniqueDay && (
        <Popover open={uniqueDayCalendarOpen} onOpenChange={setUniqueDayCalendarOpen}>
          <PopoverTrigger asChild>
            <CommandItem
              onSelect={() => {
                // Initialize calendar month if not set
                if (!uniqueDayCalendarMonth) {
                  setUniqueDayCalendarMonth(dateRange?.from || dateRange?.to || new Date())
                }
                setUniqueDayCalendarOpen(true)
              }}
              className="flex items-center gap-2 px-2 group"
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="text-sm">{uniqueDayLabel}</span>
              <div className="ml-auto flex items-center gap-1.5">
                <span className={cn(
                  "text-xs text-muted-foreground min-w-[100px] text-right",
                  (!dateRange?.from || !dateRange?.to || dateRange.from.getTime() !== dateRange.to.getTime()) && "invisible"
                )}>
                  {dateRange?.from && dateRange?.to && dateRange.from.getTime() === dateRange.to.getTime() ? formatDate(dateRange.from) : "\u00A0"}
                </span>
                {dateRange?.from && dateRange?.to && dateRange.from.getTime() === dateRange.to.getTime() && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDateRange({ from: undefined, to: undefined })
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
              <DateInputs inputs={uniqueDayInputs} onChange={handleUniqueDayInputChange} prefix="unique-" />
              <Calendar
                initialFocus
                mode="single"
                month={uniqueDayCalendarMonth}
                onMonthChange={setUniqueDayCalendarMonth}
                selected={dateRange?.from && dateRange?.to && dateRange.from.getTime() === dateRange.to.getTime() ? dateRange.from : undefined}
                onSelect={handleUniqueDaySelect}
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

