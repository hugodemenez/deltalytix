"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { useData } from "@/context/data-provider"
import { useI18n } from "@/locales/client"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { AccountSection } from "./filter-command-menu-account-section"
import { DateRangeSection } from "./filter-command-menu-date-section"
import { PnlSection } from "./filter-command-menu-pnl-section"
import { InstrumentSection } from "./filter-command-menu-instrument-section"
import { TagSection } from "./filter-command-menu-tag-section"
import { useUserStore } from "@/store/user-store"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { Kbd, KbdGroup } from "@/components/ui/kbd"

interface FilterCommandMenuProps {
  className?: string
  variant?: "navbar" | "toolbar"
}

export function FilterCommandMenu({ className, variant = "navbar" }: FilterCommandMenuProps) {
  const t = useI18n()
  const { isMobile, dateRange, setDateRange, setWeekdayFilter } = useData()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [inputWidth, setInputWidth] = useState<number | undefined>(undefined)
  const [isParsingDate, setIsParsingDate] = useState(false)
  const isMobileDevice = useMediaQuery("(max-width: 768px)")
  const inputRef = useRef<HTMLInputElement>(null)
  const commandRef = useRef<HTMLDivElement>(null)
  const dateRangeSectionRef = useRef<HTMLDivElement>(null)
  const pnlSectionRef = useRef<HTMLDivElement>(null)
  const instrumentSectionRef = useRef<HTMLDivElement>(null)
  const tagSectionRef = useRef<HTMLDivElement>(null)
  const accountSectionRef = useRef<HTMLDivElement>(null)
  const params = useParams()
  const locale = params.locale as string
  const timezone = useUserStore(state => state.timezone)
  const dateParseTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Measure input width and focus when opened
  useEffect(() => {
    if (isMobileDevice) return

    const updateWidth = () => {
      if (inputRef.current) {
        const width = inputRef.current.offsetWidth
        setInputWidth(width)
      }
    }

    // Initial measurement
    updateWidth()

    // Set up resize observer
    const resizeObserver = new ResizeObserver(updateWidth)
    if (inputRef.current) {
      resizeObserver.observe(inputRef.current)
    }

    // Focus when opened
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [open, isMobileDevice])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dateParseTimeoutRef.current) {
        clearTimeout(dateParseTimeoutRef.current)
      }
    }
  }, [])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchValue("")
      if (dateParseTimeoutRef.current) {
        clearTimeout(dateParseTimeoutRef.current)
        dateParseTimeoutRef.current = null
      }
    }
  }

  // Detect if search input contains date-related keywords
  const containsDateKeywords = useCallback((query: string): boolean => {
    const lowerQuery = query.toLowerCase().trim()
    const dateKeywords = [
      'today', 'yesterday', 'tomorrow',
      'week', 'month', 'year',
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
      'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche',
      'aujourd\'hui', 'hier', 'demain',
      'semaine', 'mois', 'année',
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
      'last', 'next', 'this', 'dernier', 'prochain', 'ce', 'cette',
      'ago', 'depuis', 'from', 'to', 'à', 'jusqu\'à'
    ]
    
    // Check for date patterns (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, etc.)
    const datePatterns = [
      /\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
      /\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY or DD/MM/YYYY
      /\d{1,2}\/\d{1,2}\/\d{4}/, // M/D/YYYY or D/M/YYYY
      /\d{1,2}-\d{1,2}-\d{4}/, // M-D-YYYY or D-M-YYYY
    ]

    // Check for keywords
    if (dateKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return true
    }

    // Check for date patterns
    if (datePatterns.some(pattern => pattern.test(query))) {
      return true
    }

    // Check for numbers that might be dates (e.g., "15" could be a day)
    if (/\d+/.test(query) && query.length <= 20) {
      return true
    }

    return false
  }, [])

  // Parse date using LLM
  const parseDateQuery = useCallback(async (query: string) => {
    if (!query.trim() || !containsDateKeywords(query)) {
      return
    }

    setIsParsingDate(true)
    try {
      const response = await fetch('/api/ai/search/date', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          locale: locale || 'en',
          timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to parse date')
      }

      const data = await response.json()
      
      // Handle weekday filter
      if (data.weekdays && Array.isArray(data.weekdays) && data.weekdays.length > 0) {
        setWeekdayFilter({ days: data.weekdays })
        // Clear search value after successful parse
        setSearchValue("")
        toast.success(t('filters.commandMenu.weekdayFilterApplied'))
      } 
      // Handle date range filter
      else if (data.from && data.to) {
        setDateRange({
          from: new Date(data.from),
          to: new Date(data.to),
        })
        // Clear search value after successful parse
        setSearchValue("")
        toast.success(t('filters.commandMenu.dateRangeApplied'))
      }
    } catch (error) {
      console.error('Error parsing date:', error)
      toast.error(t('filters.commandMenu.dateParseError'))
    } finally {
      setIsParsingDate(false)
    }
  }, [containsDateKeywords, locale, timezone, setDateRange, setWeekdayFilter, t])

  // Handle search input changes with debouncing for date parsing
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value)
    if (!open) setOpen(true)

    // Clear existing timeout
    if (dateParseTimeoutRef.current) {
      clearTimeout(dateParseTimeoutRef.current)
    }

    // Only attempt date parsing if query contains date keywords and is not too short
    if (value.trim().length >= 3 && containsDateKeywords(value)) {
      // Debounce date parsing - wait for user to finish typing or press Enter
      // We'll trigger on Enter key press instead of auto-parsing
    }
  }, [open, containsDateKeywords])

  // Handle Enter key to trigger date parsing
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Only handle Enter key for date parsing, let arrow keys pass through to Command
    if (e.key === 'Enter' && searchValue.trim() && containsDateKeywords(searchValue)) {
      e.preventDefault()
      e.stopPropagation()
      parseDateQuery(searchValue)
      return
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && searchValue.trim() && containsDateKeywords(searchValue)) {
      // Also support Cmd/Ctrl+Enter
      e.preventDefault()
      e.stopPropagation()
      parseDateQuery(searchValue)
      return
    }
    // For arrow keys, forward them to the Command component
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && commandRef.current && open) {
      e.preventDefault()
      // Find the hidden CommandInput inside the Command component
      const commandElement = commandRef.current
      const commandInput = commandElement.querySelector('input[cmdk-input]') as HTMLInputElement
      if (commandInput) {
        // Focus the command input and dispatch the arrow key event
        commandInput.focus()
        // Use requestAnimationFrame to ensure focus is set before dispatching
        requestAnimationFrame(() => {
          const keyboardEvent = new KeyboardEvent('keydown', {
            key: e.key,
            code: e.code,
            keyCode: e.keyCode,
            which: e.which,
            bubbles: true,
            cancelable: true,
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            metaKey: e.metaKey,
          })
          commandInput.dispatchEvent(keyboardEvent)
        })
      }
    }
  }, [searchValue, containsDateKeywords, parseDateQuery, open])

  // Trigger on mobile: button that opens drawer
  const MobileTriggerButton = (
    <Button
      variant="outline"
      className={cn(
        "justify-start text-left font-normal",
        variant === "toolbar" && "h-10 rounded-full",
        className
      )}
      onClick={() => setOpen(true)}
    >
      <Search className="h-4 w-4 mr-2" />
      <span className="text-muted-foreground">{t('filters.commandMenu.placeholder')}</span>
    </Button>
  )

  // Check if search value contains date keywords to show hint
  const showDateHint = searchValue.trim().length >= 3 && containsDateKeywords(searchValue) && !isParsingDate

  const handleCategoryClick = useCallback((sectionId: 'dateRange' | 'pnl' | 'instruments' | 'tags' | 'accounts') => {
    const sectionMap = {
      dateRange: dateRangeSectionRef,
      pnl: pnlSectionRef,
      instruments: instrumentSectionRef,
      tags: tagSectionRef,
      accounts: accountSectionRef,
    }

    const target = sectionMap[sectionId]?.current
    if (!target) return

    target.scrollIntoView({ behavior: 'smooth', block: 'start' })

    // Move focus to the first item inside the section for quick interaction
    const firstItem = target.querySelector('[cmdk-item]') as HTMLElement | null
    if (firstItem) {
      requestAnimationFrame(() => firstItem.focus())
    }
  }, [])

  const categories = [
    { id: 'dateRange' as const, label: t('filters.commandMenu.sections.dateRange') },
    { id: 'pnl' as const, label: t('filters.commandMenu.sections.pnl') },
    { id: 'instruments' as const, label: t('filters.commandMenu.sections.instruments') },
    { id: 'tags' as const, label: t('filters.commandMenu.sections.tags') },
    { id: 'accounts' as const, label: t('filters.commandMenu.sections.accounts') },
  ]

  // Trigger on desktop: real input that opens popover and controls search
  const DesktopTriggerInput = (
    <PopoverAnchor asChild>
      <div className={cn("relative w-[400px]", className)}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          ref={inputRef}
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (!open) setOpen(true)
          }}
          onClick={() => {
            if (!open) setOpen(true)
          }}
          placeholder={t('filters.commandMenu.searchPlaceholder')}
          className={cn(
            "pl-9 pr-20 w-full transition-all",
            variant === "toolbar" && "h-10 rounded-full",
            isParsingDate && "opacity-50",
            isParsingDate && "border-primary ring-2 ring-primary ring-offset-2 animate-pulse"
          )}
          disabled={isParsingDate}
        />
        {/* Animated outline when parsing */}
        {isParsingDate && (
          <>
            <div className="absolute inset-0 rounded-md border-2 border-primary pointer-events-none animate-pulse" />
            <div className="absolute inset-[-2px] rounded-md overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-primary/30 to-transparent animate-shimmer" style={{ width: '200%' }} />
            </div>
          </>
        )}
        {/* Date hint with Enter key */}
        {showDateHint && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-muted-foreground pointer-events-none">
            <span className="hidden sm:inline">Press</span>
            <KbdGroup>
              <Kbd>⏎</Kbd>
            </KbdGroup>
          </div>
        )}
      </div>
    </PopoverAnchor>
  )

  // Handle Command component keyboard events to detect when at top
  const handleCommandKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // If ArrowUp is pressed and we're at the top, focus back to input
    if (e.key === 'ArrowUp' && commandRef.current) {
      const commandElement = commandRef.current
      // Get all selectable items (not disabled)
      const allItems = Array.from(
        commandElement.querySelectorAll('[cmdk-item]:not([data-disabled="true"])')
      ) as HTMLElement[]
      
      if (allItems.length === 0) return
      
      const firstItem = allItems[0]
      const selectedItem = commandElement.querySelector('[cmdk-item][data-selected="true"]') as HTMLElement
      
      // Check if we're at the top:
      // 1. First item is selected, OR
      // 2. No item is selected (meaning we're about to select the first one)
      const isAtTop = selectedItem === firstItem || (!selectedItem && firstItem)
      
      if (isAtTop) {
        e.preventDefault()
        e.stopPropagation()
        
        // Focus back to the appropriate input
        if (isMobileDevice || isMobile) {
          // For mobile, focus the CommandInput
          const commandInput = commandElement.querySelector('input[cmdk-input]') as HTMLInputElement
          if (commandInput) {
            commandInput.focus()
            // Move cursor to end of input
            commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length)
          }
        } else {
          // For desktop, focus the external Input
          if (inputRef.current) {
            inputRef.current.focus()
            // Move cursor to end of input
            inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length)
          }
        }
      }
    }
  }, [isMobileDevice, isMobile])

  const CommandContent = (
    <Command 
      ref={commandRef} 
      className={cn(
        "rounded-lg border",
        (isMobileDevice || isMobile) && "h-full"
      )} 
      shouldFilter={false}
      onKeyDown={handleCommandKeyDown}
    >
      {/* Hidden CommandInput for desktop to enable arrow key navigation */}
      {!isMobileDevice && !isMobile && (
        <div className="sr-only">
          <CommandInput
            value={searchValue}
            onValueChange={handleSearchChange}
            tabIndex={-1}
          />
        </div>
      )}
      {(isMobileDevice || isMobile) && (
        <div className="border-b relative">
          <CommandInput
            placeholder={t('filters.commandMenu.searchPlaceholder')}
            value={searchValue}
            onValueChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            className={cn(
              "border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pr-20",
              isParsingDate && "opacity-50"
            )}
            disabled={isParsingDate}
          />
          {/* Animated outline when parsing */}
          {isParsingDate && (
            <>
              <div className="absolute inset-0 rounded-md border-2 border-primary pointer-events-none animate-pulse" />
              <div className="absolute inset-[-2px] rounded-md overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-primary/30 to-transparent animate-shimmer" style={{ width: '200%' }} />
              </div>
            </>
          )}
          {/* Date hint with Enter key */}
          {showDateHint && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-muted-foreground pointer-events-none">
              <span>Press</span>
              <KbdGroup>
                <Kbd>⏎</Kbd>
              </KbdGroup>
            </div>
          )}
        </div>
      )}
      <div className="px-3 pt-3 pb-2 border-b bg-muted/40">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          {t('filters.commandMenu.categories.title')}
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <Button
              key={category.id}
              variant="secondary"
              size="sm"
              className="h-8 rounded-full"
              onClick={() => handleCategoryClick(category.id)}
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>
      <CommandList className={cn(
        "overflow-y-auto",
        (isMobileDevice || isMobile) 
          ? "max-h-full" 
          : "max-h-[min(500px,calc(100vh-12rem))]"
      )}>
        <CommandEmpty>
          {isParsingDate ? t('filters.commandMenu.parsingDate') : t('filters.noResults')}
        </CommandEmpty>
        
        {/* Date Range Section */}
        <CommandGroup
          ref={dateRangeSectionRef}
          heading={t('filters.commandMenu.sections.dateRange')}
        >
          <DateRangeSection searchValue={searchValue} />
        </CommandGroup>

        <CommandSeparator />

        {/* PnL Section */}
        <CommandGroup
          ref={pnlSectionRef}
          heading={t('filters.commandMenu.sections.pnl')}
        >
          <PnlSection searchValue={searchValue} />
        </CommandGroup>

        <CommandSeparator />

        {/* Instruments Section */}
        <CommandGroup
          ref={instrumentSectionRef}
          heading={t('filters.commandMenu.sections.instruments')}
        >
          <InstrumentSection searchValue={searchValue} />
        </CommandGroup>

        <CommandSeparator />

        {/* Tags Section */}
        <CommandGroup
          ref={tagSectionRef}
          heading={t('filters.commandMenu.sections.tags')}
        >
          <TagSection searchValue={searchValue} />
        </CommandGroup>

        <CommandSeparator />

        {/* Accounts Section */}
        <CommandGroup
          ref={accountSectionRef}
          heading={t('filters.commandMenu.sections.accounts')}
        >
          <AccountSection searchValue={searchValue} />
        </CommandGroup>
      </CommandList>
    </Command>
  )

  if (isMobileDevice || isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          {MobileTriggerButton}
        </SheetTrigger>
        <SheetContent side="right" className="w-[90vw] sm:max-w-[640px] flex flex-col h-dvh overflow-hidden p-0">
          <SheetHeader className="px-4 pt-4">
            <SheetTitle>{t('filters.title')}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            {CommandContent}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      {DesktopTriggerInput}
      <PopoverContent 
        className="p-0" 
        style={{ width: inputWidth ? `${inputWidth}px` : '400px' }}
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Don't close if clicking on the input or its container
          const target = e.target as Node
          if (inputRef.current && (
            inputRef.current.contains(target) || 
            inputRef.current === target ||
            inputRef.current.parentElement?.contains(target)
          )) {
            e.preventDefault()
          }
        }}
      >
        {CommandContent}
      </PopoverContent>
    </Popover>
  )
}

