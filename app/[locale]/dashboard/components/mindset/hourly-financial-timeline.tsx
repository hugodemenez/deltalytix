"use client"

import { useMemo, useRef, useEffect, useState } from "react"
import { format } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { fr, enUS } from "date-fns/locale"
import { useCurrentLocale, useI18n } from "@/locales/client"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Clock, ExternalLink, MoreHorizontal } from "lucide-react"
import type { FinancialEvent } from "@/prisma/generated/prisma/browser"
import type { Locale } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useUserStore } from "@/store/user-store"
import {
  formatCount,
  formatCurrency,
  pnlTone,
  pnlToneClass,
  seriesColor,
  widgetType,
} from "../widgets"

type SessionKey = "ASIA" | "LONDON" | "US"

interface Session {
  key: SessionKey
  startHour: number
  endHour: number
  /** Index into the categorical series scale. Sessions are categories, not states. */
  colorIndex: number
}

const SESSIONS: Session[] = [
  { key: "ASIA", startHour: 0, endHour: 8, colorIndex: 0 },
  { key: "LONDON", startHour: 8, endHour: 16, colorIndex: 1 },
  { key: "US", startHour: 13, endHour: 21, colorIndex: 2 },
]

function useSessionLabel() {
  const t = useI18n()
  return (key: SessionKey) => {
    switch (key) {
      case "LONDON":
        return t("mindset.newsImpact.session.LONDON")
      case "US":
        return t("mindset.newsImpact.session.US")
      default:
        return t("mindset.newsImpact.session.ASIA")
    }
  }
}

function useImportanceLabel() {
  const t = useI18n()
  return (importance: string) => {
    switch (importance.toUpperCase()) {
      case "HIGH":
        return t("mindset.newsImpact.importanceFilter.high")
      case "MEDIUM":
        return t("mindset.newsImpact.importanceFilter.medium")
      default:
        return t("mindset.newsImpact.importanceFilter.low")
    }
  }
}

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

function SessionIndicator({ session, label, hourElements, containerRef }: {
  session: Session;
  label: string;
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
    <button
      type="button"
      className={cn(
        "absolute left-0 w-1 cursor-pointer rounded-sm outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "motion-safe:transition-opacity motion-safe:duration-150 motion-safe:ease-out",
        "opacity-70 hover:opacity-100",
      )}
      style={{
        top: `${startPosition}px`,
        height: `${height}px`,
        backgroundColor: seriesColor(session.colorIndex),
      }}
      onClick={handleClick}
      aria-label={label}
    />
  )
}

function SessionLegend({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const sessionLabel = useSessionLabel()

  return (
    <div className="shrink-0 border-t bg-background p-2">
      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {SESSIONS.map((session) => (
          <li key={session.key}>
            <button
              type="button"
              className={cn(
                "flex items-center gap-1.5 rounded-sm outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "motion-safe:transition-opacity motion-safe:duration-150 motion-safe:ease-out",
                "hover:opacity-80",
              )}
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
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: seriesColor(session.colorIndex) }}
              />
              <span className={widgetType.label}>{sessionLabel(session.key)}</span>
            </button>
          </li>
        ))}
      </ul>
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
  const sessionLabel = useSessionLabel()
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

  /*
   * A sub-panel, not a second card: the surface it sits on already owns the
   * border, so this only keeps the rules that separate header, scroll area and
   * legend.
   */
  return (
    <div className={cn("relative flex h-full flex-col overflow-hidden", className)}>
      {/* Header with date */}
      <div className={cn(widgetType.section, "shrink-0 border-b p-2 text-center")}>
        {formattedDate}
      </div>

      {/* Timeline content */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-y-auto"
        style={{
          overscrollBehavior: preventScrollPropagation ? 'contain' : 'auto'
        }}
      >
        {/* Session indicators */}
        <div className="absolute bottom-0 left-0 top-0 w-1">
          {SESSIONS.map((session) => (
            <SessionIndicator
              key={session.key}
              session={session}
              label={sessionLabel(session.key)}
              hourElements={hourElements}
              containerRef={containerRef}
            />
          ))}
        </div>

        <div className="flex flex-col divide-y pb-16 pl-2">
          {hours.map((hour) => {
            const hourEvents = eventsByHour.get(hour.getHours()) || []
            const hasMultipleEvents = hourEvents.length > 2
            const displayEvents = hasMultipleEvents ? hourEvents.slice(0, 2) : hourEvents

            return (
              <div
                key={hour.getTime()}
                className="relative min-h-[60px]"
                data-hour={hour.getHours()}
              >
                {/* Time indicator: a timestamp, the one place mono belongs */}
                <div className={cn(widgetType.mono, "absolute left-0 top-0 p-1 text-muted-foreground")}>
                  {formatInTimeZone(hour, timezone, "HH:mm", { locale: dateLocale })}
                </div>

                {/* Events for this hour */}
                <div className="flex flex-col gap-1 px-1 pt-6">
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
                          className="flex h-auto w-full items-center justify-center py-1 text-xs text-muted-foreground"
                        >
                          <MoreHorizontal className="mr-1 h-3 w-3" aria-hidden />
                          {t('mindset.newsImpact.moreEvents', { count: hourEvents.length - 2 })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="max-h-96 w-72 overflow-y-auto p-2">
                        <div className="flex flex-col gap-2">
                          <h4 className={cn(widgetType.mono, "text-foreground")}>{format(hour, "HH:mm")}</h4>
                          <div className="flex flex-col gap-2">
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
  const importanceLabel = useImportanceLabel()

  /*
   * Importance is ordinary metadata: it reads as a word, not a colored tile.
   * The only state that earns a token here is selection, and it is announced
   * with `aria-pressed` as well as the ring.
   */
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      className={cn(
        "w-full cursor-pointer rounded-md border px-2 py-1.5 text-left outline-none",
        "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out",
        isSelected && "border-primary",
      )}
      onClick={(e) => {
        // Ensure clicks within child elements don't bubble to outside popovers
        e.stopPropagation()
        onClick?.()
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          e.stopPropagation()
          onClick?.()
        }
      }}
    >
      <div className="truncate text-sm font-medium">{event.title}</div>

      <div className={cn(widgetType.caption, "mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5")}>
        <span>{importanceLabel(event.importance)}</span>
        {event.country && <span className="truncate">{event.country}</span>}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" aria-hidden />
          <span className="tabular-nums">
            {formatInTimeZone(new Date(event.date), timezone, "HH:mm", { locale: dateLocale })}
          </span>
        </span>
      </div>

      {expanded && event.description && (
        <p className={cn(widgetType.caption, "mt-2")}>{event.description}</p>
      )}

      {expanded && event.sourceUrl && (
        <a
          href={event.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" aria-hidden />
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
  const locale = useCurrentLocale()
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

  const totalTone = pnlTone(trade.totalPnL)
  const earliestTime = formatInTimeZone(new Date(earliestTrade.entryDate), timezone, "HH:mm", { locale: dateLocale })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full cursor-pointer rounded-md border px-2 py-1.5 text-left outline-none",
            "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out",
          )}
          onClick={() => onClick?.()}
        >
          <span className="block text-sm font-medium">
            {t('mindset.newsImpact.tradedHour')}
          </span>

          <span className={cn(widgetType.caption, "mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5")}>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" aria-hidden />
              <span className="tabular-nums">{earliestTime}</span>
            </span>
            <span className={cn(widgetType.value, pnlToneClass(totalTone))}>
              {formatCurrency(trade.totalPnL, locale)}
            </span>
          </span>

          <span className={cn(widgetType.caption, "mt-1 block")}>
            {t('mindset.newsImpact.clickToSeeMore')}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <div className="flex items-baseline justify-between gap-3 border-b p-4">
          <h4 className={widgetType.title}>
            {earliestTime} · {formatCount(trade.tradeCount, locale)}{' '}
            {trade.tradeCount === 1 ? t('mindset.tags.trade') : t('mindset.tags.trades')}
          </h4>
          <span className={cn(widgetType.value, "shrink-0", pnlToneClass(totalTone))}>
            {formatCurrency(trade.totalPnL, locale)}
          </span>
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
              {sortedTrades.map((row) => {
                const net = row.pnl - row.commission
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.instrument}</TableCell>
                    <TableCell className={widgetType.mono}>
                      {formatInTimeZone(new Date(row.entryDate), timezone, "HH:mm:ss", { locale: dateLocale })}
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", pnlToneClass(pnlTone(row.pnl)))}>
                      {formatCurrency(row.pnl, locale)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatCurrency(row.commission, locale)}
                    </TableCell>
                    <TableCell className={cn("text-right font-medium tabular-nums", pnlToneClass(pnlTone(net)))}>
                      {formatCurrency(net, locale)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
