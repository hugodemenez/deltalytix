// CalendarSection.tsx
import React from 'react'
import { DateRange } from 'react-day-picker'
import { CalendarData } from '@/lib/types'
import CalendarPnl from '../calendar-pnl'

interface CalendarSectionProps {
  dateRange: DateRange | undefined
  calendarData: CalendarData
}

export function CalendarSection({ dateRange, calendarData }: CalendarSectionProps) {
  return (
    <section id="calendar" className="mb-10">
      <h2 className="text-2xl font-bold mb-4">Calendar</h2>
      <CalendarPnl
        dateRange={{
          from: dateRange?.from || new Date(),
          to: dateRange?.to || new Date(),
        }}
        calendarData={calendarData}
      />
    </section>
  )
}