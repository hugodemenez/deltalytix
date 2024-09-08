// CalendarSection.tsx
import React from 'react'
import { CalendarData } from '@/lib/types'
import NewCalendarPnl from '../calendar/calendar-pnl'



export function CalendarSection({ calendarData }: { calendarData: CalendarData }) {
  return (
    <section id="calendar" className="mb-10">
      <NewCalendarPnl calendarData={calendarData}></NewCalendarPnl>
    </section>
  )
}