import { X, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useData } from "@/context/data-provider"
import { useI18n } from "@/locales/client"
import { format } from "date-fns"
import { fr } from 'date-fns/locale'
import { useParams } from "next/navigation"
import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from "@/store/user-store"

export function ActiveFilterTags({ showAccountNumbers }: { showAccountNumbers: boolean }) {
  const { 
    accountNumbers, 
    instruments, 
    dateRange, 
    pnlRange,
    tagFilter,
    weekdayFilter,
    setAccountNumbers, 
    setInstruments,
    setDateRange,
    setPnlRange,
    setTagFilter,
    setWeekdayFilter
  } = useData()
  const tags = useUserStore(state => state.tags)
  const t = useI18n()
  const params = useParams()
  const locale = params.locale as string
  const dateLocale = locale === 'fr' ? fr : undefined
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = useState(false)

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollWidth, clientWidth } = scrollRef.current
        setCanScroll(scrollWidth > clientWidth)
      }
    }

    // Create a ResizeObserver to monitor content changes
    const resizeObserver = new ResizeObserver(checkScroll)
    if (scrollRef.current) {
      resizeObserver.observe(scrollRef.current)
    }

    // Initial check
    checkScroll()
    
    // Window resize handler
    window.addEventListener('resize', checkScroll)
    
    return () => {
      window.removeEventListener('resize', checkScroll)
      resizeObserver.disconnect()
    }
  }, [])  // Remove dependencies to avoid re-creating observer

  // Add a separate effect to force check when content changes
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollWidth, clientWidth } = scrollRef.current
      setCanScroll(scrollWidth > clientWidth)
    }
  }, [accountNumbers, instruments, dateRange, pnlRange, tagFilter, weekdayFilter])

  const scrollToNext = () => {
    if (!scrollRef.current) return
    
    const container = scrollRef.current
    const badges = container.querySelectorAll('.badge')
    const containerLeft = container.scrollLeft
    const containerWidth = container.clientWidth

    // Find the first badge that's partially or fully out of view
    let nextBadge: Element | null = null
    for (const badge of badges) {
      const badgeLeft = badge.getBoundingClientRect().left - container.getBoundingClientRect().left
      if (badgeLeft + 20 > containerWidth) { // Adding small offset
        nextBadge = badge
        break
      }
    }

    if (nextBadge) {
      const scrollTo = nextBadge.getBoundingClientRect().left - container.getBoundingClientRect().left + container.scrollLeft
      container.scrollTo({
        left: scrollTo,
        behavior: 'smooth'
      })
    }
  }

  const anonymizeAccount = (account: string) => {
    if (!showAccountNumbers) {
      const prefix = account.slice(0, 3)
      const stars = '*'.repeat(3) // Fixed number of stars
      return `${prefix}${stars}`
    }
    return account
  }

  const handleRemoveFilter = (type: 'account' | 'instrument', value: string) => {
    switch (type) {
      case 'account':
        setAccountNumbers(accountNumbers.filter(a => a !== value))
        break
      case 'instrument':
        setInstruments(instruments.filter(i => i !== value))
        break
    }
  }

  const handleRemoveTag = (tagName: string) => {
    setTagFilter(prev => ({
      tags: prev.tags.filter(t => t !== tagName)
    }))
  }

  const handleRemoveDateRange = () => {
    setDateRange(undefined)
  }

  const handleRemovePnlRange = () => {
    setPnlRange({ min: undefined, max: undefined })
  }

  const handleRemoveWeekdayFilter = () => {
    setWeekdayFilter({ days: [] })
  }

  // Get tag color by name
  const getTagColor = (tagName: string) => {
    const tag = tags?.find(t => t.name === tagName)
    return tag?.color || '#CBD5E1'
  }

  // Format date range for display
  const formatDateRange = () => {
    if (!dateRange?.from) return null
    if (dateRange.from && dateRange.to && dateRange.from.getTime() === dateRange.to.getTime()) {
      return format(dateRange.from, "LLL dd, y", { locale: dateLocale })
    }
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "LLL dd", { locale: dateLocale })} - ${format(dateRange.to, "LLL dd, y", { locale: dateLocale })}`
    }
    return format(dateRange.from, "LLL dd, y", { locale: dateLocale })
  }

  // Format PnL range for display
  const formatPnlRange = () => {
    if (!pnlRange) return null
    if (pnlRange.min !== undefined && pnlRange.max !== undefined) {
      return `${pnlRange.min} ≤ PnL ≤ ${pnlRange.max}`
    }
    if (pnlRange.min !== undefined) {
      return `PnL ≥ ${pnlRange.min}`
    }
    if (pnlRange.max !== undefined) {
      return `PnL ≤ ${pnlRange.max}`
    }
    return null
  }

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

  // Format weekday filter display
  const formatWeekdayFilter = () => {
    if (!weekdayFilter?.days || weekdayFilter.days.length === 0) return null
    if (weekdayFilter.days.length === 1) {
      return getWeekdayName(weekdayFilter.days[0])
    }
    // Sort days for consistent display
    const sortedDays = [...weekdayFilter.days].sort((a, b) => a - b)
    return sortedDays.map(day => getWeekdayName(day)).join(', ')
  }

  const hasActiveFilters = 
    (accountNumbers?.length || 0) > 0 || 
    (instruments?.length || 0) > 0 || 
    (dateRange && (dateRange.from || dateRange.to)) || 
    (pnlRange && (pnlRange.min !== undefined || pnlRange.max !== undefined)) ||
    (tagFilter?.tags?.length || 0) > 0 ||
    (weekdayFilter?.days && weekdayFilter.days.length > 0)

  if (!hasActiveFilters) {
    return null
  }

  return (
    <motion.div
      key="active-filter-tags"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="border-t border-border/40 bg-background/50 overflow-hidden"
    >
      <div className="px-10 py-2">
        <div className="relative flex items-center overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar pr-8"
          >
            <AnimatePresence mode="popLayout">
              {/* Date Range Badge */}
              {dateRange && formatDateRange() && (
                <motion.div
                  key="date-range"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  layout
                >
                  <Badge 
                    variant="secondary" 
                    className="gap-1 shrink-0 badge cursor-pointer"
                    onClick={handleRemoveDateRange}
                  >
                    {formatDateRange()}
                    <X 
                      className="h-3 w-3" 
                    />
                  </Badge>
                </motion.div>
              )}

              {/* PnL Range Badge */}
              {pnlRange && formatPnlRange() && (
                <motion.div
                  key="pnl-range"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  layout
                >
                  <Badge 
                    variant="secondary" 
                    className="gap-1 shrink-0 badge cursor-pointer"
                    onClick={handleRemovePnlRange}
                  >
                    {formatPnlRange()}
                    <X 
                      className="h-3 w-3" 
                    />
                  </Badge>
                </motion.div>
              )}

              {/* Weekday Filter Badge */}
              {weekdayFilter?.days && weekdayFilter.days.length > 0 && formatWeekdayFilter() && (
                <motion.div
                  key="weekday-filter"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  layout
                >
                  <Badge 
                    variant="secondary" 
                    className="gap-1 shrink-0 badge cursor-pointer"
                    onClick={handleRemoveWeekdayFilter}
                  >
                    {formatWeekdayFilter()}
                    <X 
                      className="h-3 w-3" 
                    />
                  </Badge>
                </motion.div>
              )}

              {/* Account Badges */}
              {accountNumbers?.map(account => (
                <motion.div
                  key={account}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  layout
                >
                  <Badge 
                    variant="secondary" 
                    className="gap-1 shrink-0 badge cursor-pointer"
                    onClick={() => handleRemoveFilter('account', account)}
                  >
                    {anonymizeAccount(account)}
                    <X 
                      className="h-3 w-3" 
                    />
                  </Badge>
                </motion.div>
              ))}

              {/* Instrument Badges */}
              {instruments?.map(instrument => (
                <motion.div
                  key={instrument}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  layout
                >
                  <Badge 
                    variant="secondary" 
                    className="gap-1 shrink-0 badge cursor-pointer"
                    onClick={() => handleRemoveFilter('instrument', instrument)}
                  >
                    {instrument}
                    <X 
                      className="h-3 w-3" 
                    />
                  </Badge>
                </motion.div>
              ))}

              {/* Tag Badges */}
              {tagFilter?.tags?.map(tagName => {
                const tagColor = getTagColor(tagName)
                return (
                  <motion.div
                    key={tagName}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    layout
                  >
                    <Badge 
                      variant="secondary" 
                      className="gap-1 shrink-0 badge cursor-pointer"
                      style={{
                        backgroundColor: `${tagColor}20`,
                        borderColor: tagColor,
                        color: tagColor,
                      }}
                      onClick={() => handleRemoveTag(tagName)}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: tagColor }}
                      />
                      {tagName}
                      <X 
                        className="h-3 w-3" 
                      />
                    </Badge>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
          <motion.div 
            className={cn(
              "absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-background to-transparent flex items-center justify-end"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: canScroll ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-full w-8 p-0"
              onClick={scrollToNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
} 