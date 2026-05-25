"use client"

import { useMemo, useRef, useEffect, useState } from "react"
import { format } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { fr, enUS } from "date-fns/locale"
import { useCurrentLocale, useI18n } from "@/locales/client"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Clock, ExternalLink, MoreHorizontal, DollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { FinancialEvent } from "@/prisma/generated/prisma/browser"
import type { Locale } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useUserStore } from "@/store/user-store"

interface Session {
  name: string
  startHour: number
  endHour: number
  color: string
}

const SESSIONS: Session[] = [
  {
    name: "Tokyo Session",
    startHour: 0,
    endHour: 8,
    color: "bg-red-500/20 border-red-500"
  },
  {
    name: "London Session",
    startHour: 8,
    endHour: 16,
    color: "bg-blue-500/20 border-blue-500"
  },
  {
    name: "New York Session",
    startHour: 13,
    endHour: 21,
    color: "bg-green-500/20 border-green-500"
  }
]

interface HourlyFinancialTimelineProps {
  date: Date
  events: FinancialEvent[]
  trades?: Array<{
    id: string
    entryDate: string
    instrument: string
    pnl: number
    commission: number
  }>
  onEventClick?: (event: FinancialEvent) => void
  onTradeClick?: (trade: any) => void
  className?: string
  preventScrollPropagation?: boolean
  showOnlyTradedHours?: boolean
  selectedEventIds?: string[]
}

function SessionIndicator({ session, hourElements, containerRef }: { 
  session: Session; 
  hourElements: HTMLDivElement[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (!hourElements.length) return null

  // Find the start and end hour elements
  const startHourElement = hourElements[session.startHour]
  const endHourElement = hourElements[session.endHour === 0 ? 23 : session.endHour - 1]

  if (!startHourElement || !endHourElement) return null

  const startPosition = startHourElement.offsetTop
  const endPosition = endHourElement.offsetTop + endHourElement.offsetHeight
  const height = endPosition - startPosition

  const handleClick = () => {
    if (!containerRef.current) return
    containerRef.current.scrollTo({
      top: startPosition,
      behavior: 'smooth'
    })
  }

  return (
    <div 
      className={cn(
        "absolute left-0 w-1 border-l cursor-pointer transition-all hover:w-2 hover:opacity-100",
        session.color,
        "opacity-60"
      )}
      style={{
        top: `${startPosition}px`,
        height: `${height}px`
      }}
      onClick={handleClick}
      role="button"
      aria-label={`Scroll to ${session.name}`}
    />
  )
}

function SessionLegend({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className="p-2 bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 border-t shadow-lg">
      <div className="flex items-center justify-center gap-4 text-xs">
        {SESSIONS.map((session) => (
          <div 
            key={session.name} 
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              if (!containerRef.current) return
              const hourElement = containerRef.current.querySelector(`[data-hour="${session.startHour}"]`)
              if (!hourElement) return
              containerRef.current.scrollTo({
                top: hourElement.getBoundingClientRect().top - containerRef.current.getBoundingClientRect().top + containerRef.current.scrollTop,
                behavior: 'smooth'
              })
            }}
          >
            <div className={cn("w-2 h-2 rounded-full", session.color.replace("border", "bg"))} />
            <span className="text-muted-foreground">{session.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function HourlyFinancialTimeline({ 
  date, 
  events,
  trades = [],
  onEventClick,
  onTradeClick,
  className,
  preventScrollPropagation = false,
  showOnlyTradedHours = false,
  selectedEventIds = []
}: HourlyFinancialTimelineProps) {
  const timezone = useUserStore(state => state.timezone)
  const locale = useCurrentLocale()
  const dateLocale = locale === "fr" ? fr : enUS
  const t = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const [hourElements, setHourElements] = useState<HTMLDivElement[]>([])

  // Update hour elements after render
  useEffect(() => {
    if (!containerRef.current) return

    const elements = Array.from(containerRef.current.querySelectorAll('[data-hour]')) as HTMLDivElement[]
    setHourElements(elements)
  }, [events]) // Re-run when events change

  // Scroll to first event on mount when preventScrollPropagation is true
  useEffect(() => {
    if (!preventScrollPropagation || !events.length) return

    // Sort events by date to find the earliest one
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const firstEvent = sortedEvents[0]
    const firstEventDate = new Date(firstEvent.date)
    const firstEventHour = firstEventDate.getHours()

    // Use a small timeout to ensure content is rendered
    const timeoutId = setTimeout(() => {
      // Find the hour element
      const hourElement = containerRef.current?.querySelector(`[data-hour="${firstEventHour}"]`)
      if (hourElement) {
        hourElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [events, preventScrollPropagation])

  useEffect(() => {
    if (!preventScrollPropagation) return

    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isAtTop = scrollTop === 0
      const isAtBottom = scrollTop + clientHeight >= scrollHeight

      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        e.preventDefault()
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [preventScrollPropagation])

  // Get impact weight for sorting
  const getImpactWeight = (importance: string) => {
    switch (importance) {
      case "HIGH": return 3;
      case "MEDIUM": return 2;
      case "LOW": return 1;
      default: return 0;
    }
  }

  // Generate all hours of the day
  const hours = useMemo(() => {
    let allHours = Array.from({ length: 24 }, (_, i) => {
      const hour = i
      const hourDate = new Date(date)
      hourDate.setHours(hour, 0, 0, 0)
      return hourDate
    })

    if (showOnlyTradedHours) {
      // Get unique hours from trades
      const tradedHours = new Set(
        trades.map(trade => new Date(trade.entryDate).getHours())
      )
      // Filter hours to only include those with trades
      allHours = allHours.filter(hour => tradedHours.has(hour.getHours()))
    }

    return allHours
  }, [date, trades, showOnlyTradedHours])

  // Group events and trades by hour and sort by importance
  const eventsByHour = useMemo(() => {
    const hourMap = new Map<number, Array<FinancialEvent | any>>()
    const tradesByHour = new Map<number, Array<any>>()

    // Initialize all hours with empty arrays
    hours.forEach((hour) => {
      hourMap.set(hour.getHours(), [])
      tradesByHour.set(hour.getHours(), [])
    })

    // Place events in their respective hours
    events.forEach((event) => {
      const eventDate = new Date(event.date)
      const eventHour = eventDate.getHours()

      const hourEvents = hourMap.get(eventHour) || []
      hourEvents.push(event)
      hourMap.set(eventHour, hourEvents)
    })

    // Group trades by hour
    trades.forEach((trade) => {
      const tradeDate = new Date(trade.entryDate)
      const tradeHour = tradeDate.getHours()

      const hourTrades = tradesByHour.get(tradeHour) || []
      hourTrades.push(trade)
      tradesByHour.set(tradeHour, hourTrades)
    })

    // Add aggregated trades to the hour map
    tradesByHour.forEach((hourTrades, hour) => {
      if (hourTrades.length > 0) {
        const totalPnL = hourTrades.reduce((sum, trade) => sum + (trade.pnl - trade.commission), 0)
        const uniqueSymbols = new Set(hourTrades.map(trade => trade.instrument))
        
        hourMap.get(hour)?.push({
          type: 'trade',
          id: `trade-${hour}`,
          hour,
          totalPnL,
          tradeCount: hourTrades.length,
          symbols: Array.from(uniqueSymbols),
          trades: hourTrades
        })
      }
    })

    // Sort events within each hour by importance
    hourMap.forEach((hourEvents, hour) => {
      const sortedEvents = [...hourEvents].sort((a, b) => {
        if (a.type === 'trade') return -1 // Trades come first
        if (b.type === 'trade') return 1
        const weightA = getImpactWeight(a.importance)
        const weightB = getImpactWeight(b.importance)
        return weightB - weightA // Sort in descending order (HIGH to LOW)
      })
      hourMap.set(hour, sortedEvents)
    })

    return hourMap
  }, [hours, events, trades])

  // Format the date for display
  const formattedDate = useMemo(() => {
    return formatInTimeZone(date, timezone, "EEE d MMM yyyy", { locale: dateLocale })
  }, [date, timezone, dateLocale])

  return (
    <div className={cn("flex flex-col h-full border rounded-lg overflow-hidden relative", className)}>
      {/* Header with date */}
      <div className="p-2 text-center font-medium border-b bg-muted/20">{formattedDate}</div>

      {/* Timeline content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto relative "
        style={{ 
          overscrollBehavior: preventScrollPropagation ? 'contain' : 'auto'
        }}
      >
        {/* Session indicators */}
        <div className="absolute left-0 top-0 bottom-0 w-1">
          {SESSIONS.map((session) => (
            <SessionIndicator 
              key={session.name} 
              session={session} 
              hourElements={hourElements}
              containerRef={containerRef}
            />
          ))}
        </div>

        <div className="flex flex-col divide-y pl-2 pb-16">
          {hours.map((hour) => {
            const hourEvents = eventsByHour.get(hour.getHours()) || []
            const hasEvents = hourEvents.length > 0
            const hasMultipleEvents = hourEvents.length > 2
            const displayEvents = hasMultipleEvents ? hourEvents.slice(0, 2) : hourEvents

            return (
              <div 
                key={hour.getTime()} 
                className={cn("relative min-h-[60px]", hasEvents ? "bg-muted/5" : "")}
                data-hour={hour.getHours()}
              >
                {/* Time indicator */}
                <div className="absolute left-0 top-0 text-xs text-muted-foreground p-1">
                  {formatInTimeZone(hour, timezone, "HH:mm", { locale: dateLocale })}
                </div>

                {/* Events for this hour */}
                <div className="pt-6 px-1 space-y-1">
                  {displayEvents.map((item) => (
                    item.type === 'trade' ? (
                      <TradeCard
                        key={item.id}
                        trade={item}
                        onClick={() => onTradeClick?.(item)}
                        timezone={timezone}
                        dateLocale={dateLocale}
                        date={date}
                      />
                    ) : (
                      <FinancialEventCard
                        key={item.id}
                        event={item}
                        onClick={(e?: any) => {
                          // Prevent outer popover from thinking this is outside
                          if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
                          onEventClick?.(item)
                        }}
                        timezone={timezone}
                        dateLocale={dateLocale}
                        isSelected={selectedEventIds.includes(item.id)}
                      />
                    )
                  ))}

                  {/* "More" popover for hours with many events */}
                  {hasMultipleEvents && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-auto py-1 text-xs text-muted-foreground flex items-center justify-center"
                        >
                          <MoreHorizontal className="h-3 w-3 mr-1" />
                          {t('mindset.newsImpact.moreEvents', { count: hourEvents.length - 2 })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-2 max-h-96 overflow-y-auto">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">{format(hour, "HH:mm")}</h4>
                          <div className="space-y-2">
                            {hourEvents.slice(2).map((item) => (
                              item.type === 'trade' ? (
                                <TradeCard
                                  key={item.id}
                                  trade={item}
                                  onClick={() => onTradeClick?.(item)}
                                  timezone={timezone}
                                  dateLocale={dateLocale}
                                  expanded
                                  date={date}
                                />
                              ) : (
                                <FinancialEventCard
                                  key={item.id}
                                  event={item}
                                  onClick={() => onEventClick?.(item)}
                                  timezone={timezone}
                                  dateLocale={dateLocale}
                                  expanded
                                  isSelected={selectedEventIds.includes(item.id)}
                                />
                              )
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Session legend - now fixed at the bottom */}
      <SessionLegend containerRef={containerRef} />
    </div>
  )
}

interface FinancialEventCardProps {
  event: FinancialEvent
  onClick?: () => void
  timezone: string
  dateLocale: Locale
  expanded?: boolean
  isSelected?: boolean
}

function FinancialEventCard({ event, onClick, timezone, dateLocale, expanded = false, isSelected = false }: FinancialEventCardProps) {
  const t = useI18n()

  // Get color class based on event importance
  const getImportanceColorClass = (importance: string) => {
    switch (importance) {
      case "HIGH":
        return "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400"
      case "MEDIUM":
        return "bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-400"
      case "LOW":
        return "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400"
      default:
        return "bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-800/30 dark:border-gray-700 dark:text-gray-300"
    }
  }

  return (
    <div
      className={cn(
        "rounded-md p-2 cursor-pointer transition-colors hover:opacity-90",
        getImportanceColorClass(event.importance),
        !isSelected && "border-l-4",
        isSelected && "border-2 border-current"
      )}
      onClick={(e) => {
        // Ensure clicks within child elements don't bubble to outside popovers
        e.stopPropagation()
        onClick?.()
      }}
    >
      <div className="font-medium text-sm truncate">{event.title}</div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs">
        {event.country && (
          <Badge variant="outline" className="text-xs h-5 px-1.5 rounded-sm font-normal">
            {event.country}
          </Badge>
        )}

        <div className="flex items-center">
          <Clock className="h-3 w-3 mr-1 shrink-0" />
          <span>{formatInTimeZone(new Date(event.date), timezone, "HH:mm", { locale: dateLocale })}</span>
        </div>
      </div>

      {expanded && event.description && <p className="text-xs mt-2">{event.description}</p>}

      {expanded && event.sourceUrl && (
        <a
          href={event.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs mt-2 text-primary hover:text-primary/80"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
          {t("calendar.events.viewSource")}
        </a>
      )}
    </div>
  )
}

interface TradeCardProps {
  trade: {
    id: string
    hour: number
    totalPnL: number
    tradeCount: number
    symbols: string[]
    trades: Array<{
      id: string
      entryDate: string
      instrument: string
      pnl: number
      commission: number
    }>
  }
  onClick?: () => void
  timezone: string
  dateLocale: Locale
  expanded?: boolean
  date: Date
}

function TradeCard({ trade, onClick, timezone, dateLocale, expanded = false, date }: TradeCardProps) {
  const t = useI18n()
  const hourDate = new Date(date)
  hourDate.setHours(trade.hour)

  // Get the earliest trade time
  const earliestTrade = trade.trades.reduce((earliest, current) => {
    const earliestDate = new Date(earliest.entryDate)
    const currentDate = new Date(current.entryDate)
    return currentDate < earliestDate ? current : earliest
  }, trade.trades[0])

  // Sort trades by entry time in ascending order
  const sortedTrades = [...trade.trades].sort((a, b) => {
    const dateA = new Date(a.entryDate)
    const dateB = new Date(b.entryDate)
    return dateA.getTime() - dateB.getTime()
  })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "border-l-4 rounded-r-md p-2 cursor-pointer transition-colors hover:opacity-90",
            trade.totalPnL > 0 
              ? "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400"
              : "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400"
          )}
        >
          <div className="font-medium text-sm">
            {t('mindset.newsImpact.tradedHour')}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs">
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1 shrink-0" />
              <span>{formatInTimeZone(new Date(earliestTrade.entryDate), timezone, "HH:mm", { locale: dateLocale })}</span>
            </div>

            <div className="flex items-center">
              <DollarSign className="h-3 w-3 mr-1 shrink-0" />
              <span>{trade.totalPnL.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-1 text-xs text-muted-foreground underline">
            {t('mindset.newsImpact.clickToSeeMore')}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <div className="p-4 border-b">
          <h4 className="font-medium">
            {formatInTimeZone(new Date(earliestTrade.entryDate), timezone, "HH:mm", { locale: dateLocale })} - {trade.tradeCount} {trade.tradeCount === 1 ? 'Trade' : 'Trades'}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <DollarSign className="h-4 w-4" />
            <span className={cn(
              "font-medium",
              trade.totalPnL > 0 ? "text-green-500" : "text-red-500"
            )}>
              {trade.totalPnL.toFixed(2)}
            </span>
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('mindset.tradingStats.symbol')}</TableHead>
                <TableHead>{t('mindset.tradingStats.entryTime')}</TableHead>
                <TableHead className="text-right">{t('mindset.tradingStats.pnl')}</TableHead>
                <TableHead className="text-right">{t('mindset.tradingStats.commission')}</TableHead>
                <TableHead className="text-right">{t('mindset.tradingStats.netPnL')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTrades.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.instrument}</TableCell>
                  <TableCell>
                    {formatInTimeZone(new Date(t.entryDate), timezone, "HH:mm:ss", { locale: dateLocale })}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right",
                    t.pnl > 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {t.pnl.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {t.commission.toFixed(2)}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-medium",
                    (t.pnl - t.commission) > 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {(t.pnl - t.commission).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
} 