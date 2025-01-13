'use client'

import React, { useState, useEffect } from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, getDay, endOfWeek, addDays } from "date-fns"
import { fr, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, AlertCircle, Info, LineChart, BarChart, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Trade, FinancialEvent } from "@prisma/client"
import { updateTradesWithComment } from "@/server/database"
import { toast } from "@/hooks/use-toast"
import { CalendarEntry, CalendarData } from "@/types/calendar"
import { CalendarModal } from "./new-modal"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getFinancialEvents } from "@/server/financial-events"
import { useI18n, useCurrentLocale } from "@/locales/client"


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

export default function CalendarPnl({ calendarData, financialEvents = [] }: CalendarPnlProps) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const dateLocale = locale === 'fr' ? fr : enUS
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [aiComment, setAiComment] = useState<string>("")
  const [aiEmotion, setAiEmotion] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [monthEvents, setMonthEvents] = useState<FinancialEvent[]>(financialEvents)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarDays = getCalendarDays(monthStart, monthEnd)

  // Fetch financial events when month changes
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // const events = await getFinancialEvents(currentDate)
        const events: FinancialEvent[] = []
        if (Array.isArray(events)) {
          setMonthEvents(events)
        } else {
          console.error('Unexpected events format:', events)
          setMonthEvents([])
        }
      } catch (error) {
        console.error('Error fetching financial events:', error)
        toast({
          title: "Error",
          description: "Failed to load financial events.",
          variant: "destructive",
        })
        setMonthEvents([])
      }
    }
    fetchEvents()
  }, [currentDate])

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))

  const handleGenerateComment = async (dayData: CalendarEntry, dateString: string) => {
    setIsLoading(true)
    try {
      const result = await updateTradesWithComment(dayData, dateString)
      setAiComment(result.comment)
      setAiEmotion(result.emotion)
      toast({
        title: "Success",
        description: t('calendar.generateComment')
      })
    } catch (error) {
      console.error("Error generating and saving comment:", error)
      setAiComment("Failed to generate and save comment")
      setAiEmotion("Error")
      toast({
        title: "Error",
        description: t('calendar.commentError'),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

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
      const date = new Date(dateString);
      if (isSameMonth(date, currentDate)) {
        return total + dayData.pnl;
      }
      return total;
    }, 0);
  };

  const monthlyTotal = calculateMonthlyTotal()

  const getEventsForDate = (date: Date) => {
    return monthEvents.filter(event => {
      if (!event.date) return false;
      try {
        // Since event.date from Prisma is already a Date object, we can use it directly
        return format(event.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      } catch (error) {
        console.error('Error parsing event date:', error);
        return false;
      }
    });
  };

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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader 
        className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-[56px]"
      >
        <div className="flex items-center gap-3">
          <CardTitle className="text-base sm:text-lg font-semibold truncate capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
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
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-1.5 sm:p-4">
        <div className="grid grid-cols-8 gap-x-[1px] mb-1">
          {[...WEEKDAYS, 'calendar.weekdays.weekly' as const].map((day) => (
            <div key={day} className="text-center font-medium text-[9px] sm:text-[11px] text-muted-foreground">
              {t(day)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-8 auto-rows-fr gap-[1px] ring-1 ring-border/40 rounded-lg h-[calc(100%-20px)]">
          {calendarDays.map((date, index) => {
            const dateString = format(date, 'yyyy-MM-dd')
            const dayData = calendarData[dateString]
            const isLastDayOfWeek = getDay(date) === 6
            const isCurrentMonth = isSameMonth(date, currentDate)
            const dateEvents = getEventsForDate(date)

            return (
              <React.Fragment key={dateString}>
                <div
                  className={cn(
                    "h-full flex flex-col cursor-pointer transition-all rounded-none p-0.5 sm:p-1 ring-1 ring-border/40",
                    "hover:relative hover:ring-1 hover:ring-primary hover:z-10",
                    dayData && dayData.pnl >= 0
                      ? "bg-green-50 dark:bg-green-900/20"
                      : dayData && dayData.pnl < 0
                      ? "bg-red-50 dark:bg-red-900/20"
                      : "bg-card",
                    !isCurrentMonth && "bg-opacity-25 dark:bg-opacity-25",
                    isToday(date) && "ring-blue-500 bg-blue-500/5",
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
                      !isCurrentMonth && "opacity-25"
                    )}>
                      {format(date, 'd')}
                    </span>
                    {dateEvents.length > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col items-end gap-0.5 max-w-[80%]">
                              {dateEvents.map((event, idx) => {
                                // Trim the title to show only the main part
                                const trimmedTitle = event.title
                                  .replace('Data Release', '')
                                  .replace('Report', '')
                                  .replace('Meeting', '')
                                  .replace('Estimate', '')
                                  .trim()
                                return (
                                  <div
                                    key={event.id}
                                    className={cn(
                                      getEventImportanceColor(event.importance),
                                      !isCurrentMonth && "opacity-25",
                                      "flex items-center justify-end gap-1 text-[8px] sm:text-[9px] w-full"
                                    )}
                                  >
                                    <span className="truncate text-right">{trimmedTitle}</span>
                                    {getEventIcon(event.type)}
                                  </div>
                                )
                              })}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent align="center" className="max-w-[300px]">
                            <div className="space-y-2">
                              {dateEvents.map(event => (
                                <div key={event.id} className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={cn(
                                      "flex items-center gap-1",
                                      getEventImportanceColor(event.importance)
                                    )}>
                                      {getEventIcon(event.type)}
                                      <Badge variant="outline" className={cn(
                                        "text-[10px] px-1 py-0",
                                        getEventImportanceColor(event.importance)
                                      )}>
                                        {event.importance}
                                      </Badge>
                                    </span>
                                    <span className="font-medium text-sm">{event.title}</span>
                                  </div>
                                  {event.description && (
                                    <p className="text-xs text-muted-foreground pl-5">
                                      {event.description}
                                    </p>
                                  )}
                                  {event.sourceUrl && (
                                    <a
                                      href={event.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 pl-5"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      View on Investing.com
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-end gap-0.5">
                    {dayData ? (
                      <div className={cn(
                        "text-[9px] sm:text-[11px] font-semibold truncate text-center",
                        dayData.pnl >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400",
                        !isCurrentMonth && "opacity-25"
                      )}>
                        {formatCurrency(dayData.pnl)}
                      </div>
                    ) : (
                      <div className={cn(
                        "text-[9px] sm:text-[11px] font-semibold invisible text-center",
                        !isCurrentMonth && "opacity-25"
                      )}>$0</div>
                    )}
                    <div className={cn(
                      "text-[7px] sm:text-[9px] text-muted-foreground truncate text-center",
                      !isCurrentMonth && "opacity-25"
                    )}>
                      {dayData 
                        ? `${dayData.tradeNumber} ${dayData.tradeNumber > 1 ? t('calendar.trades') : t('calendar.trade')}` 
                        : t('calendar.noTrades')}
                    </div>
                  </div>
                </div>
                {isLastDayOfWeek && (
                  <div className={cn(
                    "h-full flex items-center justify-center rounded-none bg-card/50 ring-1 ring-border/40",
                    index === 6 && "rounded-tr-lg",
                    index === 41 && "rounded-br-lg"
                  )}>
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
    </Card>
  )
}

function calculateWeeklyTotal(index: number, calendarDays: Date[], calendarData: CalendarData) {
  const startOfWeekIndex = index - 6
  const weekDays = calendarDays.slice(startOfWeekIndex, index + 1)
  return weekDays.reduce((total, day) => {
    const dayData = calendarData[format(day, 'yyyy-MM-dd')]
    return total + (dayData ? dayData.pnl : 0)
  }, 0)
}