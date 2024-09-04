// Graphs.tsx
import React from 'react'
import DailyChart from './daily-chart'
import PNLChart from './pnl-bar-chart'
import { CalendarData } from '@/lib/types'

interface GraphsProps {
  calendarData: CalendarData
}

export function Graphs({ calendarData }: GraphsProps) {
  return (
    <section id="graphs" className="mb-10 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Charts</h2>
      <DailyChart dailyTradingData={calendarData} />
      <PNLChart dailyTradingData={calendarData} />
    </section>
  )
}