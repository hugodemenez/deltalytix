"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { fr, enUS } from "date-fns/locale"
import { useUserData } from "@/components/context/user-data"
import { useCurrentLocale, useI18n } from "@/locales/client"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Clock, ExternalLink, MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { FinancialEvent } from "@prisma/client"
import type { Locale } from "date-fns"

interface HourlyFinancialTimelineProps {
  date: Date
  events: FinancialEvent[]
  onEventClick?: (event: FinancialEvent) => void
  className?: string
}

export function HourlyFinancialTimeline({ date, events, onEventClick, className }: HourlyFinancialTimelineProps) {
  const { timezone } = useUserData()
  const locale = useCurrentLocale()
  const dateLocale = locale === "fr" ? fr : enUS
  const t = useI18n()

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
    return Array.from({ length: 24 }, (_, i) => {
      const hour = i
      const hourDate = new Date(date)
      hourDate.setHours(hour, 0, 0, 0)
      return hourDate
    })
  }, [date])

  // Group events by hour and sort by importance
  const eventsByHour = useMemo(() => {
    const hourMap = new Map<number, FinancialEvent[]>()

    // Initialize all hours with empty arrays
    hours.forEach((hour) => {
      hourMap.set(hour.getHours(), [])
    })

    // Place events in their respective hours
    events.forEach((event) => {
      const eventDate = new Date(event.date)
      const eventHour = eventDate.getHours()

      const hourEvents = hourMap.get(eventHour) || []
      hourEvents.push(event)
      hourMap.set(eventHour, hourEvents)
    })

    // Sort events within each hour by importance
    hourMap.forEach((hourEvents, hour) => {
      const sortedEvents = [...hourEvents].sort((a, b) => {
        const weightA = getImpactWeight(a.importance)
        const weightB = getImpactWeight(b.importance)
        return weightB - weightA // Sort in descending order (HIGH to LOW)
      })
      hourMap.set(hour, sortedEvents)
    })

    return hourMap
  }, [hours, events])

  // Format the date for display
  const formattedDate = useMemo(() => {
    return formatInTimeZone(date, timezone, "EEE d MMM yyyy", { locale: dateLocale })
  }, [date, timezone, dateLocale])

  return (
    <div className={cn("flex flex-col h-full border rounded-lg overflow-hidden", className)}>
      {/* Header with date */}
      <div className="p-2 text-center font-medium border-b bg-muted/20">{formattedDate}</div>

      {/* Timeline content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col divide-y">
          {hours.map((hour) => {
            const hourEvents = eventsByHour.get(hour.getHours()) || []
            const hasEvents = hourEvents.length > 0
            const hasMultipleEvents = hourEvents.length > 2
            const displayEvents = hasMultipleEvents ? hourEvents.slice(0, 2) : hourEvents

            return (
              <div key={hour.getTime()} className={cn("relative min-h-[60px]", hasEvents ? "bg-muted/5" : "")}>
                {/* Time indicator */}
                <div className="absolute left-0 top-0 text-xs text-muted-foreground p-1">
                  {formatInTimeZone(hour, timezone, "HH:mm", { locale: dateLocale })}
                </div>

                {/* Events for this hour */}
                <div className="pt-6 px-1 space-y-1">
                  {displayEvents.map((event) => (
                    <FinancialEventCard
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick?.(event)}
                      timezone={timezone}
                      dateLocale={dateLocale}
                    />
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
                      <PopoverContent className="w-72 p-2">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">{format(hour, "HH:mm")}</h4>
                          <div className="space-y-2">
                            {hourEvents.slice(2).map((event) => (
                              <FinancialEventCard
                                key={event.id}
                                event={event}
                                onClick={() => onEventClick?.(event)}
                                timezone={timezone}
                                dateLocale={dateLocale}
                                expanded
                              />
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
    </div>
  )
}

interface FinancialEventCardProps {
  event: FinancialEvent
  onClick?: () => void
  timezone: string
  dateLocale: Locale
  expanded?: boolean
}

function FinancialEventCard({ event, onClick, timezone, dateLocale, expanded = false }: FinancialEventCardProps) {
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
        "border-l-4 rounded-r-md p-2 cursor-pointer transition-colors hover:opacity-90",
        getImportanceColorClass(event.importance),
      )}
      onClick={onClick}
    >
      <div className="font-medium text-sm truncate">{event.title}</div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs">
        {event.country && (
          <Badge variant="outline" className="text-xs h-5 px-1.5 rounded-sm font-normal">
            {event.country}
          </Badge>
        )}

        <div className="flex items-center">
          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
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