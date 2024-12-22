'use client'

import React, { useState } from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, getDay, endOfWeek, addDays } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Trade } from "@prisma/client"
import { updateTradesWithComment } from "@/server/database"
import { toast } from "@/hooks/use-toast"
import { CalendarEntry, CalendarData } from "@/types/calendar"
import { CalendarModal } from "./new-modal"

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

export default function CalendarPnl({ calendarData }: { calendarData: CalendarData }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [aiComment, setAiComment] = useState<string>("")
  const [aiEmotion, setAiEmotion] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarDays = getCalendarDays(monthStart, monthEnd)

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))

  const handleGenerateComment = async (dayData: CalendarEntry, dateString: string) => {
    setIsLoading(true)
    try {
      const result = await updateTradesWithComment(dayData, dateString)
      setAiComment(result.comment)
      setAiEmotion(result.emotion)
      toast({
        title: "Comment Generated",
        description: "The AI comment has been generated and saved for all trades on this day.",
      })
    } catch (error) {
      console.error("Error generating and saving comment:", error)
      setAiComment("Failed to generate and save comment")
      setAiEmotion("Error")
      toast({
        title: "Error",
        description: "Failed to generate and save the AI comment.",
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b shrink-0 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base sm:text-lg font-semibold truncate">
              {format(currentDate, 'MMMM yyyy')}
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
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-1.5 sm:p-4">
        <div className="grid grid-cols-8 gap-x-[1px] mb-1">
          {[...WEEKDAYS, 'Weekly'].map((day) => (
            <div key={day} className="text-center font-medium text-[9px] sm:text-[11px] text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-8 auto-rows-fr gap-[1px] ring-1 ring-border/40 rounded-lg h-[calc(100%-20px)]">
          {calendarDays.map((date, index) => {
            const dateString = format(date, 'yyyy-MM-dd')
            const dayData = calendarData[dateString]
            const isLastDayOfWeek = getDay(date) === 6
            const isCurrentMonth = isSameMonth(date, currentDate)

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
                    {dayData ? (
                      <div className={cn(
                        "text-[9px] sm:text-[11px] font-semibold truncate max-w-[70%] text-right",
                        dayData.pnl >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400",
                        !isCurrentMonth && "opacity-25"
                      )}>
                        {formatCurrency(dayData.pnl)}
                      </div>
                    ) : (
                      <div className={cn(
                        "text-[9px] sm:text-[11px] font-semibold invisible",
                        !isCurrentMonth && "opacity-25"
                      )}>$0</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-end">
                    <div className={cn(
                      "text-[7px] sm:text-[9px] text-muted-foreground truncate text-center",
                      !isCurrentMonth && "opacity-25"
                    )}>
                      {dayData ? `${dayData.tradeNumber} trade${dayData.tradeNumber > 1 ? 's' : ''}` : 'No trades'}
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