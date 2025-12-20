'use client'

import React, { useState } from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay, addDays } from "date-fns"
import { formatInTimeZone, toDate } from 'date-fns-tz'
import { fr, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarModal } from "./daily-modal"
import { CalendarData } from "@/app/[locale]/dashboard/types/calendar"
import { Card, CardTitle } from "@/components/ui/card"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { useUserStore } from "../../../../../store/user-store"

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

// Generates an array of 42 YYYY-MM-DD date strings for the calendar grid,
// ensuring calculations respect the target timezone.
function getCalendarDayStrings(currentMonthDate: Date, timezone: string, weekStartsOnMonday: boolean = false): string[] {
  // 1. Get the start of the month in the target timezone string format (YYYY-MM-01)
  const monthStartString = formatInTimeZone(currentMonthDate, timezone, 'yyyy-MM-01');
  // 2. Convert this string to a Date object representing midnight *in the target timezone*.
  const firstDayOfMonthInTZ = toDate(monthStartString, { timeZone: timezone });
  // 3. Get the day of the week (0=Sunday, 6=Saturday) for this first day *in the target timezone*.
  const startDayOfWeek = getDay(firstDayOfMonthInTZ); // getDay uses the locale's start of week, but the Date object is timezone-correct

  // 4. Calculate the actual start date of the grid (Sunday or Monday) by subtracting days from the first day.
  // `addDays` operates on the underlying timestamp but starts from a timezone-aware Date.
  // If week starts on Monday, adjust: Monday=1, so subtract (startDayOfWeek === 0 ? 6 : startDayOfWeek - 1)
  const daysToSubtract = weekStartsOnMonday 
    ? (startDayOfWeek === 0 ? 6 : startDayOfWeek - 1)
    : startDayOfWeek;
  let currentGridDate = addDays(firstDayOfMonthInTZ, -daysToSubtract);

  const dayStrings: string[] = [];
  for (let i = 0; i < 42; i++) {
    // Format the current grid date *in the target timezone* for the array
    dayStrings.push(formatInTimeZone(currentGridDate, timezone, 'yyyy-MM-dd'));
    // Increment the date for the next iteration
    currentGridDate = addDays(currentGridDate, 1);
  }

  // Ensure we always return exactly 42 days. Should be guaranteed by the loop.
  return dayStrings;
}

// Checks if a given YYYY-MM-DD date string matches today's date in the target timezone.
function isDateStringToday(dateString: string, timezone: string): boolean {
  const todayString = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
  return dateString === todayString;
}

export default function MobileCalendarPnl({ calendarData }: { calendarData: CalendarData }) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const timezone = useUserStore(state => state.timezone)
  const dateLocale = locale === 'fr' ? fr : enUS
  const weekStartsOnMonday = locale === 'fr'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Generate calendar date strings based on the current date and timezone
  const calendarDayStrings = getCalendarDayStrings(currentDate, timezone, weekStartsOnMonday)

  // Get the current month and year based on the state date *in the target timezone*
  // Use a reference date (start of the month) in the target timezone for reliable comparison.
  const currentMonthReferenceDate = toDate(formatInTimeZone(currentDate, timezone, 'yyyy-MM-01'), { timeZone: timezone });
  const currentMonth = currentMonthReferenceDate.getMonth()
  const currentYear = currentMonthReferenceDate.getFullYear()

  // Define weekday headers (Monday start for French locale, Sunday start otherwise)
  const weekdayHeaders = weekStartsOnMonday
    ? [
        { key: 'monday', label: t('calendar.weekdays.mon') },
        { key: 'tuesday', label: t('calendar.weekdays.tue') },
        { key: 'wednesday', label: t('calendar.weekdays.wed') },
        { key: 'thursday', label: t('calendar.weekdays.thu') },
        { key: 'friday', label: t('calendar.weekdays.fri') },
        { key: 'saturday', label: t('calendar.weekdays.sat') },
        { key: 'sunday', label: t('calendar.weekdays.sun') }
      ]
    : [
        { key: 'sunday', label: t('calendar.weekdays.sun') },
        { key: 'monday', label: t('calendar.weekdays.mon') },
        { key: 'tuesday', label: t('calendar.weekdays.tue') },
        { key: 'wednesday', label: t('calendar.weekdays.wed') },
        { key: 'thursday', label: t('calendar.weekdays.thu') },
        { key: 'friday', label: t('calendar.weekdays.fri') },
        { key: 'saturday', label: t('calendar.weekdays.sat') }
      ]

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))

  const calculateMonthlyTotal = () => {
    // This calculation correctly uses dateString keys which are already YYYY-MM-DD
    return Object.entries(calendarData).reduce((total, [dateString, dayData]) => {
      // Parse the date string to compare month and year
      try {
        // Use UTC for parsing the key to avoid local shifts, then compare components
        const date = toDate(dateString + 'T00:00:00Z') 
        if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
          return total + dayData.pnl
        }
      } catch (e) {
        console.error("Error parsing date string in calculateMonthlyTotal:", dateString, e)
      }
      return total
    }, 0)
  }
  
  const monthlyTotal = calculateMonthlyTotal()
  
  const getMaxPnl = () => {
    // This calculation correctly uses dateString keys which are already YYYY-MM-DD
    return Math.max(0, ...Object.entries(calendarData)
      .filter(([dateString]) => {
        try {
          // Use UTC for parsing the key to avoid local shifts, then compare components
          const date = toDate(dateString + 'T00:00:00Z')
          return date.getFullYear() === currentYear && date.getMonth() === currentMonth
        } catch (e) {
          console.error("Error parsing date string in getMaxPnl:", dateString, e)
          return false
        }
      })
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
        <div className="grid grid-cols-7 gap-x-px mb-1">
          {weekdayHeaders.map((day) => (
            <div key={day.key} className="text-center font-medium text-[9px] sm:text-[11px] text-muted-foreground">
              {day.label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr gap-px h-[calc(100%-20px)]">
          {calendarDayStrings.map((dateString) => { // Iterate over date strings
            const dayData = calendarData[dateString] // Direct lookup using the string key

            // Parse the date string *in the target timezone* to get a Date object
            // for reliable month/year checks and display formatting.
            let dateInTZ: Date;
            try {
              dateInTZ = toDate(dateString, { timeZone: timezone });
            } catch (e) {
              console.error("Error parsing date string for display:", dateString, e);
              // Render a placeholder or skip if parsing fails
              return <div key={dateString} className="text-red-500">Error</div>;
            }

            // Determine if the date belongs to the currently displayed month
            const isCurrentMonthDay =
              dateInTZ.getMonth() === currentMonth &&
              dateInTZ.getFullYear() === currentYear

            // contribution calculation uses dayData which is already correct
            const contribution = dayData && monthlyTotal !== 0
              ? Math.abs(dayData.pnl / monthlyTotal) 
              : 0
            const strokeDasharray = contribution > 0 
              ? `${contribution * 100} ${100 - (contribution * 100)}`
              : "0 100"

            return (
              <div
                key={dateString} // Key is the timezone-correct date string
                className={cn(
                  "relative flex items-center justify-center",
                  !isCurrentMonthDay && "opacity-30" // Fade based on timezone-correct check
                )}
                onClick={() => setSelectedDate(dateInTZ)} // Pass the Date object parsed in the target timezone
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
                  // Check today using the date string and timezone
                  isDateStringToday(dateString, timezone) && "bg-primary text-primary-foreground",
                  // Style based on PnL, ensuring not to override 'today' style
                  dayData && dayData.pnl !== 0 && !isDateStringToday(dateString, timezone) && (
                    dayData.pnl > 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )
                )}>
                  <span className="text-lg font-semibold">
                    {/* Display the day number from the date parsed in the target timezone */}
                    {format(dateInTZ, 'd')}
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
        // Look up dayData using the selectedDate formatted back into a YYYY-MM-DD string *in the target timezone*
        dayData={selectedDate ? calendarData[formatInTimeZone(selectedDate, timezone, 'yyyy-MM-dd')] : undefined}
        isLoading={isLoading}
      />
    </Card>
  )
}