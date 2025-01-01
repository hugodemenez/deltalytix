import { X, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useFormattedTrades } from "@/components/context/trades-data"
import { useI18n } from "@/locales/client"
import { format } from "date-fns"
import { fr } from 'date-fns/locale'
import { useParams } from "next/navigation"
import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function ActiveFilterTags({ showAccountNumbers }: { showAccountNumbers: boolean }) {
  const { accountNumbers, instruments, dateRange, setAccountNumbers, setInstruments, setDateRange } = useFormattedTrades()
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
  }, [accountNumbers, instruments, dateRange])

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

  const formatDate = (date: Date) => {
    return format(date, "LLL dd, y", { locale: dateLocale })
  }

  const anonymizeAccount = (account: string) => {
    if (!showAccountNumbers) {
      const prefix = account.slice(0, 3)
      const stars = '*'.repeat(3) // Fixed number of stars
      return `${prefix}${stars}`
    }
    return account
  }

  const handleRemoveFilter = (type: 'account' | 'instrument' | 'date', value?: string) => {
    switch (type) {
      case 'account':
        setAccountNumbers(accountNumbers.filter(a => a !== value))
        break
      case 'instrument':
        setInstruments(instruments.filter(i => i !== value))
        break
      case 'date':
        setDateRange(undefined)
        break
    }
  }

  if (!accountNumbers?.length && !instruments?.length && !dateRange) {
    return null
  }

  return (
    <div className="relative flex items-center overflow-hidden">
      <div 
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar pb-2 pr-8"
      >
        {dateRange && (
          <Badge variant="secondary" className="gap-1 shrink-0 badge">
            {formatDate(dateRange.from)} - {formatDate(dateRange.to)}
            <X 
              className="h-3 w-3 cursor-pointer" 
              onClick={() => handleRemoveFilter('date')}
            />
          </Badge>
        )}
        {accountNumbers?.map(account => (
          <Badge key={account} variant="secondary" className="gap-1 shrink-0 badge">
            {anonymizeAccount(account)}
            <X 
              className="h-3 w-3 cursor-pointer" 
              onClick={() => handleRemoveFilter('account', account)}
            />
          </Badge>
        ))}
        {instruments?.map(instrument => (
          <Badge key={instrument} variant="secondary" className="gap-1 shrink-0 badge">
            {instrument}
            <X 
              className="h-3 w-3 cursor-pointer" 
              onClick={() => handleRemoveFilter('instrument', instrument)}
            />
          </Badge>
        ))}
      </div>
      <div 
        className={cn(
          "absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent flex items-center justify-end",
          !canScroll && "hidden"
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-full w-8 p-0"
          onClick={scrollToNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
} 