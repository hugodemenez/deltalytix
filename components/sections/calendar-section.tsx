// CalendarSection.tsx
import React from 'react'
import { CalendarData } from '@/lib/types'
import NewCalendarPnl from '../calendar/calendar-pnl'
import { useCalendarData } from '../context/trades-data'

export function CalendarSection() {
  const { calendarData } = useCalendarData()

  return (
    <section id="calendar" className="mb-10">
      <NewCalendarPnl calendarData={calendarData}></NewCalendarPnl>
    </section>
  )
}