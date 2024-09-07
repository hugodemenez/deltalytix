'use client'

import React, { useState } from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Trade } from "@prisma/client"
import { updateTradesWithComment } from "@/server/database"
import { toast } from "@/hooks/use-toast"
import { CalendarModal } from "@/components/calendar/modal"

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export type CalendarEntry = {
  pnl: number;
  tradeNumber: number;
  longNumber: number;
  shortNumber: number;
  trades: Trade[];
};

export type CalendarData = {
  [date: string]: CalendarEntry;
};

export default function CalendarPnl({ calendarData }: { calendarData: CalendarData }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [aiComment, setAiComment] = useState<string>("")
  const [aiEmotion, setAiEmotion] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{format(currentDate, 'MMMM yyyy')}</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-4">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center font-semibold">{day}</div>
        ))}
        {calendarDays.map((date) => {
          const dateString = format(date, 'yyyy-MM-dd')
          const dayData = calendarData[dateString]
          
          return (
            <React.Fragment key={dateString}>
              <Card
                className={cn(
                  "h-24 cursor-pointer hover:border-primary transition-colors",
                  !isSameMonth(date, currentDate) && "opacity-50",
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
                <CardHeader className="p-2">
                  <CardTitle className="text-xs font-medium flex justify-between">
                    <span>{format(date, 'd')}</span>
                    {isToday(date) && <Badge variant="outline">Today</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  {dayData ? (
                    <>
                      <div className={cn(
                        "text-sm font-bold",
                        dayData.pnl >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      )}>
                        ${dayData.pnl.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dayData.tradeNumber} trade{dayData.tradeNumber > 1 ? 's' : ''}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">No trades</div>
                  )}
                </CardContent>
              </Card>
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
        aiComment={aiComment}
        aiEmotion={aiEmotion}
        isLoading={isLoading}
        handleGenerateComment={handleGenerateComment}
      />
    </div>
  )
}