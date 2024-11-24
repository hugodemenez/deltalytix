'use client'
// CalendarSection.tsx
import React from 'react'
import { useCalendarData } from '@/components/context/trades-data'
import CalendarPnl from '../calendar/calendar-pnl'

export function CalendarSection() {
  const { calendarData } = useCalendarData()

  return (
    <section id="calendar" className="mb-10">
      <CalendarPnl  />
    </section>
  )
}