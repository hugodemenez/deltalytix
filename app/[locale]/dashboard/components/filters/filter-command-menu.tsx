"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList } from "@/components/ui/command"
import { useData } from "@/context/data-provider"
import { useI18n } from "@/locales/client"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { useModalStateStore } from "@/store/modal-state-store"
import { AccountSection } from "./filter-command-menu-account-section"
import { DateRangeSection } from "./filter-command-menu-date-section"
import { PnlSection } from "./filter-command-menu-pnl-section"
import { InstrumentSection } from "./filter-command-menu-instrument-section"
import { TagSection } from "./filter-command-menu-tag-section"
import { FilterFoldSection } from "./filter-fold-section"
import {
  countActiveFilters,
  countSectionFilters,
  type FilterSectionKey,
} from "./active-filter-model"
import { useUserStore } from "@/store/user-store"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { Kbd, KbdGroup } from "@/components/ui/kbd"

function isPortaledOverlayTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest("[data-radix-popper-content-wrapper]") ||
      target.closest("[data-radix-select-viewport]") ||
      target.closest('[role="listbox"]') ||
      target.closest("[data-sonner-toast]")
  )
}

interface FilterCommandMenuProps {
  className?: string
  variant?: "navbar" | "toolbar"
  compactBreakpoint?: number
  compact?: boolean
}

export function FilterCommandMenu({
  className,
  variant = "navbar",
  compactBreakpoint = 768,
  compact = false,
}: FilterCommandMenuProps) {
  const t = useI18n()
  const {
    isMobile,
    setDateRange,
    setWeekdayFilter,
    setAccountNumbers,
    setInstruments,
    setPnlRange,
    setTagFilter,
    dateRange,
    pnlRange,
    weekdayFilter,
    accountNumbers,
    instruments,
    tagFilter,
  } = useData()
  const params = useParams()
  const locale = params.locale as string
  const filterState = {
    dateRange,
    pnlRange,
    weekdayFilter,
    accountNumbers,
    instruments,
    tagFilter,
  }
  const activeFilterCount = countActiveFilters(filterState)

  const clearSection = (section: FilterSectionKey) => {
    switch (section) {
      case "dateRange":
        setDateRange(undefined)
        setWeekdayFilter({ days: [] })
        return
      case "tags":
        setTagFilter({ tags: [] })
        return
      case "instruments":
        setInstruments([])
        return
      case "accounts":
        setAccountNumbers([])
        return
      case "pnl":
        setPnlRange({ min: undefined, max: undefined })
    }
  }
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [openSection, setOpenSection] = useState<FilterSectionKey | null>(null)
  const [isParsingDate, setIsParsingDate] = useState(false)
  const isMobileDevice = useMediaQuery(`(max-width: ${compactBreakpoint}px)`)
  const useMobileDrawer = isMobileDevice || isMobile
  const useDesktopDropdown = variant === "navbar" && !useMobileDrawer
  const showInlineSearch = useMobileDrawer
  const accountGroupBoardOpen = useModalStateStore((state) => state.accountGroupBoardOpen)
  const inputRef = useRef<HTMLInputElement>(null)
  const commandRef = useRef<HTMLDivElement>(null)
  const timezone = useUserStore(state => state.timezone)
  const dateParseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSearching = searchValue.trim().length > 0

  const openFilters = (section: FilterSectionKey | null = null) => {
    setOpenSection(section)
    setOpen(true)
  }

  useEffect(() => {
    return () => {
      if (dateParseTimeoutRef.current) {
        clearTimeout(dateParseTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (accountGroupBoardOpen && open) {
      setOpen(false)
    }
  }, [accountGroupBoardOpen, open])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchValue("")
      setOpenSection(null)
      if (dateParseTimeoutRef.current) {
        clearTimeout(dateParseTimeoutRef.current)
        dateParseTimeoutRef.current = null
      }
    }
  }

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

    const datePatterns = [
      /\d{4}-\d{2}-\d{2}/,
      /\d{2}\/\d{2}\/\d{4}/,
      /\d{1,2}\/\d{1,2}\/\d{4}/,
      /\d{1,2}-\d{1,2}-\d{4}/,
    ]

    if (dateKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return true
    }

    if (datePatterns.some(pattern => pattern.test(query))) {
      return true
    }

    if (/\d+/.test(query) && query.length <= 20) {
      return true
    }

    return false
  }, [])

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

      if (data.weekdays && Array.isArray(data.weekdays) && data.weekdays.length > 0) {
        setWeekdayFilter({ days: data.weekdays })
        setSearchValue("")
        toast.success(t('filters.commandMenu.weekdayFilterApplied'))
      } else if (data.from && data.to) {
        setDateRange({
          from: new Date(data.from),
          to: new Date(data.to),
        })
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

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value)
    if (!open) setOpen(true)
    if (value.trim()) setOpenSection(null)

    if (dateParseTimeoutRef.current) {
      clearTimeout(dateParseTimeoutRef.current)
    }
  }, [open])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim() && containsDateKeywords(searchValue)) {
      e.preventDefault()
      e.stopPropagation()
      parseDateQuery(searchValue)
      return
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && searchValue.trim() && containsDateKeywords(searchValue)) {
      e.preventDefault()
      e.stopPropagation()
      parseDateQuery(searchValue)
      return
    }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && commandRef.current && open) {
      e.preventDefault()
      const commandElement = commandRef.current
      const commandInput = commandElement.querySelector('input[cmdk-input]') as HTMLInputElement
      if (commandInput) {
        commandInput.focus()
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

  const chromeButtonClass =
    'inline-flex h-7 shrink-0 items-center rounded-[4px] border border-[#E5E5E5] bg-white transition-colors hover:bg-[#FAFAFA] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-muted/40'
  const chromeTextClass = 'text-xs font-medium text-[#737373] dark:text-muted-foreground'
  const chromeIconClass = 'text-sm font-medium text-[#171717] dark:text-foreground'

  const filterTriggerButton = (
    <button
      type="button"
      onClick={useDesktopDropdown ? undefined : () => openFilters()}
      aria-label={
        activeFilterCount > 0
          ? t("filters.addFilterAriaCount", { count: activeFilterCount })
          : t("filters.addFilterAria")
      }
      aria-haspopup={useDesktopDropdown ? 'dialog' : undefined}
      aria-expanded={useDesktopDropdown ? open : undefined}
      className={cn(
        chromeButtonClass,
        compact
          ? cn(chromeIconClass, 'relative h-7 w-7 justify-center p-0')
          : cn(chromeTextClass, 'px-2.5'),
        useDesktopDropdown && 'data-[state=open]:bg-[#FAFAFA] dark:data-[state=open]:bg-muted/40',
        className
      )}
    >
      {compact ? (
        <>
          <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
          {activeFilterCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#171717] px-1 text-[10px] font-semibold leading-none text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </>
      ) : (
        <span className="inline-flex items-center gap-1.5">
          {t("filters.addFilter")}
          {activeFilterCount > 0 ? (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#171717] px-1 text-[10px] font-semibold tabular-nums leading-none text-white dark:bg-foreground dark:text-background">
              {activeFilterCount}
            </span>
          ) : null}
        </span>
      )}
    </button>
  )

  const NavbarTriggers = useDesktopDropdown ? (
    <PopoverTrigger asChild>{filterTriggerButton}</PopoverTrigger>
  ) : (
    filterTriggerButton
  )

  const MobileTriggerButton = (
    <Button
      variant={compact ? "ghost" : "outline"}
      className={cn(
        "font-normal overflow-hidden",
        compact
          ? "h-11 w-11 shrink-0 rounded-full p-0"
          : "justify-start text-left",
        variant === "toolbar" && !compact && "h-10 rounded-full max-w-full",
        className
      )}
      onClick={() => openFilters()}
      aria-label={compact ? t('filters.commandMenu.searchPlaceholderMobile') : undefined}
    >
      <Search className={cn("h-4 w-4", !compact && "mr-2")} />
      {!compact && (
        <span className="text-muted-foreground truncate">{t('filters.commandMenu.searchPlaceholderMobile')}</span>
      )}
    </Button>
  )

  const showDateHint = searchValue.trim().length >= 3 && containsDateKeywords(searchValue) && !isParsingDate

  const DesktopTriggerInput = (
    <div className={cn("relative w-full max-w-[400px]", className)}>
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
        {isParsingDate && (
          <>
            <div className="absolute inset-0 rounded-md border-2 border-primary pointer-events-none animate-pulse" />
            <div className="absolute inset-[-2px] rounded-md overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-primary/30 to-transparent animate-shimmer" style={{ width: '200%' }} />
            </div>
          </>
        )}
      {showDateHint && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-muted-foreground pointer-events-none">
          <span className="hidden sm:inline">Press</span>
          <KbdGroup>
            <Kbd>⏎</Kbd>
          </KbdGroup>
        </div>
      )}
    </div>
  )

  const handleCommandKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowUp' && commandRef.current) {
      const commandElement = commandRef.current
      const allItems = Array.from(
        commandElement.querySelectorAll('[cmdk-item]:not([data-disabled="true"])')
      ) as HTMLElement[]

      if (allItems.length === 0) return

      const firstItem = allItems[0]
      const selectedItem = commandElement.querySelector('[cmdk-item][data-selected="true"]') as HTMLElement
      const isAtTop = selectedItem === firstItem || (!selectedItem && firstItem)

      if (isAtTop) {
        e.preventDefault()
        e.stopPropagation()

        if (showInlineSearch) {
          const commandInput = commandElement.querySelector('input[cmdk-input]') as HTMLInputElement
          if (commandInput) {
            commandInput.focus()
            commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length)
          }
        } else if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length)
        }
      }
    }
  }, [showInlineSearch])

  const filterSections = [
    {
      key: "dateRange" as const,
      label: t("filters.commandMenu.sections.date"),
      content: <DateRangeSection searchValue={searchValue} />,
    },
    {
      key: "tags" as const,
      label: t("filters.commandMenu.sections.tags"),
      content: <TagSection searchValue={searchValue} />,
    },
    {
      key: "instruments" as const,
      label: t("filters.commandMenu.sections.instruments"),
      content: <InstrumentSection searchValue={searchValue} />,
    },
    {
      key: "accounts" as const,
      label: t("filters.commandMenu.sections.accounts"),
      content: <AccountSection searchValue={searchValue} />,
    },
    {
      key: "pnl" as const,
      label: t("filters.commandMenu.sections.pnl"),
      content: <PnlSection searchValue={searchValue} />,
    },
  ]

  const CommandContent = (
    <Command
      ref={commandRef}
      className={cn(
        "flex min-h-0 flex-1 flex-col rounded-none border-0",
        useDesktopDropdown ? "max-h-full overflow-hidden" : "h-auto"
      )}
      shouldFilter={false}
      onKeyDown={handleCommandKeyDown}
    >
      {!showInlineSearch && !useDesktopDropdown && (
        <div className="sr-only">
          <CommandInput
            value={searchValue}
            onValueChange={handleSearchChange}
            tabIndex={-1}
          />
        </div>
      )}
      {showInlineSearch && (
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
          {isParsingDate && (
            <>
              <div className="absolute inset-0 rounded-md border-2 border-primary pointer-events-none animate-pulse" />
              <div className="absolute inset-[-2px] rounded-md overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-primary/30 to-transparent animate-shimmer" style={{ width: '200%' }} />
              </div>
            </>
          )}
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
      <CommandList className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {isSearching || isParsingDate ? (
          <CommandEmpty>
            {isParsingDate ? t('filters.commandMenu.parsingDate') : t('filters.noResults')}
          </CommandEmpty>
        ) : null}

        {filterSections.map(({ key, label, content }) => {
          const expanded = isSearching || openSection === key
          return (
            <FilterFoldSection
              key={key}
              label={label}
              expanded={expanded}
              activeCount={countSectionFilters(key, filterState)}
              placement={useDesktopDropdown && !isSearching ? "submenu" : "inline"}
              onToggle={() => {
                if (isSearching) return
                setOpenSection((current) => (current === key ? null : key))
              }}
              onHoverOpen={() => {
                if (isSearching) return
                setOpenSection(key)
              }}
              onClear={() => clearSection(key)}
            >
              <CommandGroup className="min-h-0 overflow-visible">{content}</CommandGroup>
            </FilterFoldSection>
          )
        })}
      </CommandList>
    </Command>
  )

  if (useDesktopDropdown) {
    return (
      <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
        {NavbarTriggers}
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          collisionPadding={8}
          aria-label={t('filters.title')}
          className={cn(
            'flex flex-col overflow-hidden p-0',
            'w-56 max-h-[min(24rem,var(--radix-popover-content-available-height))]',
            'rounded-md border border-[#E5E5E5] bg-white shadow-md dark:border-border dark:bg-background'
          )}
          onInteractOutside={(event) => {
            if (isPortaledOverlayTarget(event.target)) {
              event.preventDefault()
            }
          }}
          onFocusOutside={(event) => {
            if (isPortaledOverlayTarget(event.target)) {
              event.preventDefault()
            }
          }}
        >
          <h2 className="sr-only">{t('filters.title')}</h2>
          {CommandContent}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <>
      {variant === 'navbar'
        ? NavbarTriggers
        : useMobileDrawer
          ? MobileTriggerButton
          : DesktopTriggerInput}
      {useMobileDrawer ? (
        <Drawer
          open={open}
          onOpenChange={handleOpenChange}
          shouldScaleBackground={false}
        >
          <DrawerContent className="max-h-[85svh] gap-0 overflow-hidden rounded-t-[4px] border-[#E5E5E5] bg-white p-0 dark:border-border dark:bg-background">
            <DrawerHeader className="shrink-0 border-b border-[#E5E5E5] px-4 py-3 text-left dark:border-border">
              <DrawerTitle className="text-lg font-semibold tracking-[-0.025em]">
                {t('filters.title')}
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                {t('filters.commandMenu.categories.title')}
              </DrawerDescription>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              {CommandContent}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent
            side="right"
            overlayClassName="bg-black/15 dark:bg-black/70"
            className="flex h-dvh w-[90vw] flex-col overflow-hidden border-l border-[#E5E5E5] bg-white p-0 dark:border-border dark:bg-background sm:max-w-[420px]"
          >
            <SheetHeader className="shrink-0 border-b border-[#E5E5E5] px-4 py-4 text-left dark:border-border">
              <SheetTitle className="text-lg font-semibold tracking-[-0.025em]">
                {t('filters.title')}
              </SheetTitle>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-hidden">
              {CommandContent}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}
