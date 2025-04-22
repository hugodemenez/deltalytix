'use client'

import React, { useState } from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, addDays, getDay } from "date-fns"
import { formatInTimeZone } from 'date-fns-tz'
import { fr, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarModal } from "./new-modal"
import { CalendarData } from "@/types/calendar"
import { Card, CardTitle } from "@/components/ui/card"
import { useUserData } from "@/components/context/user-data"
import { useI18n, useCurrentLocale } from "@/locales/client"

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

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

function isDateToday(date: Date, timezone: string): boolean {
  const today = new Date()
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd') === formatInTimeZone(today, timezone, 'yyyy-MM-dd')
}

export default function MobileCalendarPnl({ calendarData }: { calendarData: CalendarData }) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const { timezone } = useUserData()
  const dateLocale = locale === 'fr' ? fr : enUS
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarDays = getCalendarDays(monthStart, monthEnd)

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
    return Math.max(...Object.entries(calendarData)
      .filter(([dateString]) => isSameMonth(new Date(dateString), currentDate))
      .map(([_, data]) => Math.abs(data.pnl)))
  }

  const maxPnl = getMaxPnl()

  return (
    <Card className="h-full flex flex-col">
      <div className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-[56px]">
        <div className="flex items-center gap-3">
          <CardTitle className="text-xl font-semibold truncate capitalize">
            {formatInTimeZone(currentDate, timezone, 'MMMM yyyy', { locale: dateLocale })}
          </CardTitle>
          <span className={cn(
            "text-sm font-semibold truncate",
            monthlyTotal >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            ${formatCurrency(monthlyTotal)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" onClick={handlePrevMonth} className="h-7 w-7 sm:h-8 sm:w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-7 w-7 sm:h-8 sm:w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-1.5 sm:p-4">
        <div className="grid grid-cols-7 gap-x-[1px] mb-1">
          {[
            { key: 'sunday', label: t('calendar.weekdays.sun') },
            { key: 'monday', label: t('calendar.weekdays.mon') },
            { key: 'tuesday', label: t('calendar.weekdays.tue') },
            { key: 'wednesday', label: t('calendar.weekdays.wed') },
            { key: 'thursday', label: t('calendar.weekdays.thu') },
            { key: 'friday', label: t('calendar.weekdays.fri') },
            { key: 'saturday', label: t('calendar.weekdays.sat') }
          ].map((day) => (
            <div key={day.key} className="text-center font-medium text-[9px] sm:text-[11px] text-muted-foreground">
              {day.label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr gap-[1px] h-[calc(100%-20px)]">
          {calendarDays.map((date) => {
            const dateString = formatInTimeZone(date, timezone, 'yyyy-MM-dd')
            const dayData = calendarData[dateString]
            const contribution = dayData && monthlyTotal !== 0 
              ? Math.abs(dayData.pnl / monthlyTotal) 
              : 0
            const strokeDasharray = contribution > 0 
              ? `${contribution * 100} ${100 - (contribution * 100)}`
              : "0 100"

            return (
              <div
                key={dateString}
                className={cn(
                  "relative flex items-center justify-center",
                  !isSameMonth(date, currentDate) && "opacity-30"
                )}
                onClick={() => setSelectedDate(date)}
              >
                {dayData && (
                  <svg
                    className="absolute w-10 h-10 -rotate-90"
                    viewBox="0 0 36 36"
                  >
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      className="stroke-current opacity-10"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      className={cn(
                        "stroke-current transition-all",
                        dayData.pnl >= 0 ? "stroke-green-500" : "stroke-red-500"
                      )}
                      strokeWidth="2.5"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset="0"
                    />
                  </svg>
                )}
                <div className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-full z-10",
                  isDateToday(date, timezone) && "bg-primary text-primary-foreground",
                  dayData && dayData.pnl !== 0 && !isDateToday(date, timezone) && (
                    dayData.pnl > 0 
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )
                )}>
                  <span className="text-lg font-semibold">
                    {formatInTimeZone(date, timezone, 'd')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <CalendarModal
        isOpen={selectedDate !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDate(null)
        }}
        selectedDate={selectedDate}
        dayData={selectedDate ? calendarData[formatInTimeZone(selectedDate, timezone, 'yyyy-MM-dd')] : undefined}
        isLoading={isLoading}
      />
    </Card>
  )
}