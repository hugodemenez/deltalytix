'use client'

import React, { useState } from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarData, CalendarEntry } from "./calendar-pnl"
import { CalendarModal } from "./new-modal"

export default function MobileCalendarPnl({ calendarData }: { calendarData: CalendarData }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))

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

  const getMaxPnl = () => {
    return Math.max(...Object.values(calendarData).map(data => Math.abs(data.pnl)))
  }

  const maxPnl = getMaxPnl()

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold">{format(currentDate, 'MMMM')}</h2>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-muted-foreground">{day}</div>
        ))}
        {calendarDays.map((date) => {
          const dateString = format(date, 'yyyy-MM-dd')
          const dayData = calendarData[dateString]
          const pnlPercentage = dayData ? Math.min(Math.abs(dayData.pnl) / maxPnl, 1) : 0

          return (
            <div
              key={dateString}
              className={cn(
                "flex flex-col items-center",
                !isSameMonth(date, currentDate) && "opacity-30",
                isToday(date) && "bg-primary text-primary-foreground rounded-full"
              )}
              onClick={() => setSelectedDate(date)}
            >
              <span className={cn(
                "text-2xl font-bold mb-1",
                isToday(date) ? "text-primary-foreground" : "text-foreground"
              )}>
                {format(date, 'd')}
              </span>
              {dayData && (
                <div
                  className={cn(
                    "w-full h-1 rounded-full",
                    dayData.pnl >= 0 ? "bg-green-500" : "bg-red-500"
                  )}
                  style={{ width: `${pnlPercentage * 100}%` }}
                />
              )}
            </div>
          )
        })}
      </div>
      <div className={cn(
        "text-2xl font-bold text-center",
        monthlyTotal >= 0 ? "text-green-500" : "text-red-500"
      )}>
        ${monthlyTotal.toFixed(2)}
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