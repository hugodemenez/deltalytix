'use client'

import React, { useState, useEffect } from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, getDay, endOfWeek, addDays, isSameDay } from "date-fns"
import { formatInTimeZone } from 'date-fns-tz'
import { fr, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, AlertCircle, Info, LineChart, BarChart, ExternalLink, Newspaper, X, Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import { FinancialEvent } from "@prisma/client"
import { toast } from "@/hooks/use-toast"
import { CalendarEntry, CalendarData } from "@/types/calendar"
import { CalendarModal } from "./new-modal"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getFinancialEvents } from "@/server/financial-events"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { WeeklyModal } from "./weekly-modal"
import { useUserData } from "@/components/context/user-data"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { HourlyFinancialTimeline } from "../mindset/hourly-financial-timeline"
import { ImportanceFilter } from "@/components/importance-filter"
import { CountryFilter } from "@/components/country-filter"
import { useNewsFilterStore } from "@/store/news-filter"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


const WEEKDAYS = [
  'calendar.weekdays.sun',
  'calendar.weekdays.mon',
  'calendar.weekdays.tue',
  'calendar.weekdays.wed',
  'calendar.weekdays.thu',
  'calendar.weekdays.fri',
  'calendar.weekdays.sat'
] as const


function getCalendarDays(monthStart: Date, monthEnd: Date) {
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: startDate, end: endDate })
  
  if (days.length === 42) return days
  
  const lastDay = days[days.length - 1]
  const additionalDays = eachDayOfInterval({
    start: addDays(lastDay, 1),
    end: addDays(startDate, 41)
  })
  
  return [...days, ...additionalDays].slice(0, 42)
}

const formatCurrency = (value: number) => {
  const formatted = value.toLocaleString('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
  return formatted
}

interface CalendarPnlProps {
  calendarData: CalendarData;
  financialEvents?: FinancialEvent[];
}

const getEventIcon = (eventType: string) => {
  switch (eventType.toLowerCase()) {
    case 'economic':
      return <Info className="h-3 w-3" />
    case 'earnings':
      return <BarChart className="h-3 w-3" />
    case 'technical':
      return <LineChart className="h-3 w-3" />
    default:
      return <AlertCircle className="h-3 w-3" />
  }
}

const getEventImportanceColor = (importance: string) => {
  switch (importance.toUpperCase()) {
    case 'HIGH':
      return "text-red-500 dark:text-red-400"
    case 'MEDIUM':
      return "text-yellow-500 dark:text-yellow-400"
    case 'LOW':
      return "text-blue-500 dark:text-blue-400"
    default:
      return "text-muted-foreground"
  }
}

type ImpactLevel = "low" | "medium" | "high"
const IMPACT_LEVELS: ImpactLevel[] = ["low", "medium", "high"]

const getEventImportanceStars = (importance: string): ImpactLevel => {
  switch (importance.toUpperCase()) {
    case 'HIGH':
      return "high"
    case 'MEDIUM':
      return "medium"
    case 'LOW':
      return "low"
    default:
      return "low"
  }
}

function EventBadge({ events, impactLevels }: { events: FinancialEvent[], impactLevels: ImpactLevel[] }) {
  const t = useI18n()
  const { timezone } = useUserData()
  const locale = useCurrentLocale()
  const dateLocale = locale === 'fr' ? fr : enUS

  // Filter events by impact level
  const filteredEvents = events.filter(e => impactLevels.includes(getEventImportanceStars(e.importance)))
  if (filteredEvents.length === 0) return null

  // Get the highest importance level for color coding
  const highestImportance = filteredEvents.reduce((highest, event) => {
    const level = getEventImportanceStars(event.importance)
    const levelIndex = IMPACT_LEVELS.indexOf(level)
    return Math.max(highest, levelIndex)
  }, 0)

  const badgeStyles = {
    2: "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20",
    1: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20",
    0: "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20"
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            "h-4 px-1.5 text-[8px] sm:text-[9px] font-medium cursor-pointer relative z-0 w-auto justify-center items-center gap-1",
            badgeStyles[highestImportance as keyof typeof badgeStyles],
            "transition-all duration-200 ease-in-out",
            "hover:scale-110 hover:shadow-md",
            "active:scale-95"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Newspaper className="h-2.5 w-2.5" />
          {filteredEvents.length}
        </Badge>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0 z-50" 
        align="start"
        side="right"
        sideOffset={5}
        onClick={(e) => e.stopPropagation()}
      >
        <HourlyFinancialTimeline
          date={filteredEvents.length > 0 ? new Date(filteredEvents[0].date) : new Date()}
          events={filteredEvents}
          className="h-[400px]"
          preventScrollPropagation={true}
        />
      </PopoverContent>
    </Popover>
  )
}

export default function CalendarPnl({ calendarData, financialEvents = [] }: CalendarPnlProps) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const { timezone, financialEvents: userFinancialEvents = [] } = useUserData()
  const dateLocale = locale === 'fr' ? fr : enUS
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [aiComment, setAiComment] = useState<string>("")
  const [aiEmotion, setAiEmotion] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [monthEvents, setMonthEvents] = useState<FinancialEvent[]>([])
  const [selectedWeekDate, setSelectedWeekDate] = useState<Date | null>(null)

  // Use the global news filter store
  const impactLevels = useNewsFilterStore((s) => s.impactLevels)
  const setImpactLevels = useNewsFilterStore((s) => s.setImpactLevels)
  const selectedCountries = useNewsFilterStore((s) => s.selectedCountries)
  const setSelectedCountries = useNewsFilterStore((s) => s.setSelectedCountries)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarDays = getCalendarDays(monthStart, monthEnd)

  // Update monthEvents when currentDate or financialEvents change
  useEffect(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    
    const filteredEvents = userFinancialEvents.filter(event => {
      const eventDate = new Date(event.date)
      return eventDate >= monthStart && eventDate <= monthEnd && event.lang === locale
    })
    
    setMonthEvents(filteredEvents)
  }, [currentDate, userFinancialEvents, locale])

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))

  const initializeComment = (dayData: CalendarEntry | undefined) => {
    if (dayData && dayData.trades.length > 0) {
      const lastTrade = dayData.trades[dayData.trades.length - 1]
      if (lastTrade.comment) {
        const commentParts = lastTrade.comment.split('(Emotion:')
        setAiComment(commentParts[0].trim())
        setAiEmotion(commentParts[1] ? commentParts[1].replace(')', '').trim() : '')
      } else {
        setAiComment("")
        setAiEmotion("")
      }
    } else {
      setAiComment("")
      setAiEmotion("")
    }
  }

  const calculateMonthlyTotal = () => {
    return Object.entries(calendarData).reduce((total, [dateString, dayData]) => {
      const date = new Date(dateString)
      if (isSameMonth(date, currentDate)) {
        return total + dayData.pnl
      }
      return total
    }, 0)
  }

  const monthlyTotal = calculateMonthlyTotal()

  const getEventsForDate = React.useCallback((date: Date) => {
    return monthEvents.filter(event => {
      if (!event.date) return false;
      try {
        // Create new Date objects to avoid modifying the originals
        const eventDateObj = new Date(event.date)
        const compareDateObj = new Date(date)
        
        // Set hours to start of day
        eventDateObj.setHours(0, 0, 0, 0)
        compareDateObj.setHours(0, 0, 0, 0)
        
        // Format dates in the user's timezone
        const eventDate = formatInTimeZone(eventDateObj, timezone, 'yyyy-MM-dd')
        const compareDate = formatInTimeZone(compareDateObj, timezone, 'yyyy-MM-dd')
        
        return eventDate === compareDate
      } catch (error) {
        console.error('Error parsing event date:', error)
        return false
      }
    })
  }, [monthEvents, timezone])

  const calculateWeeklyTotal = React.useCallback((index: number, calendarDays: Date[], calendarData: CalendarData) => {
    const startOfWeekIndex = index - 6
    const weekDays = calendarDays.slice(startOfWeekIndex, index + 1)
    return weekDays.reduce((total, day) => {
      const dayData = calendarData[formatInTimeZone(day, timezone, 'yyyy-MM-dd')]
      return total + (dayData ? dayData.pnl : 0)
    }, 0)
  }, [timezone])

  // Get unique countries from events
  const countries = Array.from(new Set(monthEvents
    .map(event => event.country)
    .filter((country): country is string => country !== null && country !== undefined)
  )).sort((a, b) => {
    if (a === "United States") return -1;
    if (b === "United States") return 1;
    return a.localeCompare(b);
  });

  // Filter events by impact level and country
  function filterByImpactLevel(events: FinancialEvent[]) {
    const { impactLevels, selectedCountries } = useNewsFilterStore.getState()
    
    return events.filter(e => {
      const matchesImpact = impactLevels.length === 0 || 
        impactLevels.includes(getEventImportanceStars(e.importance))
      
      const matchesCountry = selectedCountries.length === 0 || 
        (e.country && selectedCountries.includes(e.country))
      
      return matchesImpact && matchesCountry
    })
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader 
        className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-[56px]"
      >
        <div className="flex items-center gap-3">
          <CardTitle className="text-base sm:text-lg font-semibold truncate capitalize">
            {formatInTimeZone(currentDate, timezone, 'MMMM yyyy', { locale: dateLocale })}
          </CardTitle>
          <div className={cn(
            "text-sm sm:text-base font-semibold truncate",
            monthlyTotal >= 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          )}>
            {formatCurrency(monthlyTotal)}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Impact Level Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              {t('calendar.importanceFilter.title')}
            </span>
            <ImportanceFilter
              value={impactLevels}
              onValueChange={setImpactLevels}
              className="h-8"
            />
          </div>
          <CountryFilter 
            countries={countries} 
            value={selectedCountries}
            onValueChange={setSelectedCountries}
            className="h-8" 
          />
          <div className="flex items-center gap-1.5">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handlePrevMonth} 
              className="h-7 w-7 sm:h-8 sm:w-8"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleNextMonth} 
              className="h-7 w-7 sm:h-8 sm:w-8"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-1.5 sm:p-4">
        <div className="grid grid-cols-8 gap-x-[1px] mb-1">
          {[...WEEKDAYS, 'calendar.weekdays.weekly' as const].map((day) => (
            <div key={day} className="text-center font-medium text-[9px] sm:text-[11px] text-muted-foreground">
              {t(day)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-8 auto-rows-fr rounded-lg h-[calc(100%-20px)]">
          {calendarDays.map((date, index) => {
            const dateString = format(date, 'yyyy-MM-dd')
            const dayData = calendarData[dateString]
            const isLastDayOfWeek = getDay(date) === 6
            const isCurrentMonth = isSameMonth(date, currentDate)
            const dateEvents = filterByImpactLevel(getEventsForDate(date))

            return (
              <React.Fragment key={dateString}>
                <div
                  className={cn(
                    "h-full flex flex-col cursor-pointer transition-all rounded-none p-1",
                    "ring-1 ring-border hover:ring-primary hover:z-10",
                    dayData && dayData.pnl >= 0
                      ? "bg-green-50 dark:bg-green-900/20"
                      : dayData && dayData.pnl < 0
                      ? "bg-red-50 dark:bg-red-900/20"
                      : "bg-card",
                    !isCurrentMonth && "",
                    isToday(date) && "ring-blue-500 bg-blue-500/5 z-10",
                    index === 0 && "rounded-tl-lg",
                    index === 35 && "rounded-bl-lg",
                  )}
                  onClick={() => {
                    setSelectedDate(date)
                    initializeComment(dayData)
                  }}
                >
                  <div className="flex justify-between items-start gap-0.5">
                    <span className={cn(
                      "text-[9px] sm:text-[11px] font-medium min-w-[14px] text-center",
                      isToday(date) && "text-primary font-semibold",
                      !isCurrentMonth && "opacity-50"
                    )}>
                      {format(date, 'd')}
                    </span>
                    {dateEvents.length > 0 && <EventBadge events={dateEvents} impactLevels={impactLevels} />}
                  </div>
                  <div className="flex-1 flex flex-col justify-end gap-0.5">
                    {dayData ? (
                      <div className={cn(
                        "text-[9px] sm:text-[11px] font-semibold truncate text-center",
                        dayData.pnl >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400",
                        !isCurrentMonth && "opacity-50"
                      )}>
                        {formatCurrency(dayData.pnl)}
                      </div>
                    ) : (
                      <div className={cn(
                        "text-[9px] sm:text-[11px] font-semibold invisible text-center",
                        !isCurrentMonth && "opacity-50"
                      )}>$0</div>
                    )}
                    <div className={cn(
                      "text-[7px] sm:text-[9px] text-muted-foreground truncate text-center",
                      !isCurrentMonth && "opacity-50"
                    )}>
                      {dayData 
                        ? `${dayData.tradeNumber} ${dayData.tradeNumber > 1 ? t('calendar.trades') : t('calendar.trade')}` 
                        : t('calendar.noTrades')}
                    </div>
                  </div>
                </div>
                {isLastDayOfWeek && (
                  <div 
                    className={cn(
                      "h-full flex items-center justify-center rounded-none cursor-pointer",
                      "ring-1 ring-border hover:ring-primary hover:z-10",
                      index === 6 && "rounded-tr-lg",
                      index === 41 && "rounded-br-lg"
                    )}
                    onClick={() => setSelectedWeekDate(date)}
                  >
                    <div className={cn(
                       "text-[9px] sm:text-[11px] font-semibold truncate px-0.5",
                       calculateWeeklyTotal(index, calendarDays, calendarData) >= 0
                         ? "text-green-600 dark:text-green-400"
                         : "text-red-600 dark:text-red-400"
                    )}>
                      {formatCurrency(calculateWeeklyTotal(index, calendarDays, calendarData))}
                    </div>
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </CardContent>
      <CalendarModal
        isOpen={selectedDate !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDate(null)
        }}
        selectedDate={selectedDate}
        dayData={selectedDate ? calendarData[format(selectedDate, 'yyyy-MM-dd')] : undefined}
        isLoading={isLoading}
      />
      <WeeklyModal
        isOpen={selectedWeekDate !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedWeekDate(null)
        }}
        selectedDate={selectedWeekDate}
        calendarData={calendarData}
        isLoading={isLoading}
      />
    </Card>
  )
}