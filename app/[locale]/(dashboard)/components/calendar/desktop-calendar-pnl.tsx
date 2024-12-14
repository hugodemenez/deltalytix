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
  
  // If we already have 42 days (6 rows × 7 days), return as is
  if (days.length === 42) return days
  
  // If we have less than 42 days, add days from the next month
  const lastDay = days[days.length - 1]
  const additionalDays = eachDayOfInterval({
    start: addDays(lastDay, 1),
    end: addDays(startDate, 41) // Ensure we get exactly 6 rows
  })
  
  return [...days, ...additionalDays].slice(0, 42) // Ensure exactly 42 days
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
    <div className="flex flex-col h-full space-y-2 p-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg sm:text-xl font-bold">{format(currentDate, 'MMMM yyyy')}</h2>
          <div className={cn(
            "text-base font-bold",
            monthlyTotal >= 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          )}>
            ${monthlyTotal.toFixed(2)}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-8 grid-rows-[auto_repeat(6,1fr)] gap-x-1 gap-y-0.5 flex-1 min-h-0">
        {[...WEEKDAYS, 'Weekly'].map((day) => (
          <div key={day} className="text-center font-semibold text-[10px] sm:text-xs">{day}</div>
        ))}
        {calendarDays.map((date, index) => {
          const dateString = format(date, 'yyyy-MM-dd')
          const dayData = calendarData[dateString]
          const isLastDayOfWeek = getDay(date) === 6

          return (
            <React.Fragment key={dateString}>
              <Card
                className={cn(
                  "h-full cursor-pointer hover:border-primary transition-colors",
                  !isSameMonth(date, currentDate) && "opacity-25",
                  dayData && dayData.pnl >= 0
                    ? "bg-green-50 dark:bg-green-900/20"
                    : dayData && dayData.pnl < 0
                    ? "bg-red-50 dark:bg-red-900/20"
                    : ""
                )}
                onClick={() => {
                  setSelectedDate(date)
                  initializeComment(dayData)
                }}
              >
                <CardHeader className="p-0.5">
                  <CardTitle className="text-[10px] font-medium flex justify-between items-center">
                    <span>{format(date, 'd')}</span>
                    {isToday(date) && <Badge variant="outline" className="text-[8px] px-0.5">Today</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0.5">
                  {dayData ? (
                    <>
                      <div className={cn(
                        "text-[10px] sm:text-xs font-bold",
                        dayData.pnl >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      )}>
                        ${dayData.pnl.toFixed(2)}
                      </div>
                      <div className="text-[8px] sm:text-[10px] text-muted-foreground">
                        {dayData.tradeNumber} trade{dayData.tradeNumber > 1 ? 's' : ''}
                      </div>
                    </>
                  ) : (
                    <div className="text-[8px] sm:text-[10px] text-muted-foreground">No trades</div>
                  )}
                </CardContent>
              </Card>
              {isLastDayOfWeek && (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="p-0.5 flex items-center justify-center">
                    <div className={cn(
                      "text-[10px] sm:text-xs font-bold",
                      calculateWeeklyTotal(index, calendarDays, calendarData) >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    )}>
                      ${calculateWeeklyTotal(index, calendarDays, calendarData).toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              )}
            </React.Fragment>
          )
        })}
      </div>
      <CalendarModal
        isOpen={selectedDate !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDate(null)
        }}
        selectedDate={selectedDate}
        dayData={selectedDate ? calendarData[format(selectedDate, 'yyyy-MM-dd')] : undefined}
        isLoading={isLoading}
      />
    </div>
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