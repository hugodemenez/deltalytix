// Graphs.tsx
import React from 'react'
import DailyChart from '../charts/daily-chart'
import PNLChart from '../charts/pnl-bar-chart'
import { CalendarData } from '@/lib/types'
import EquityChart from '../charts/equity-chart'

interface GraphsProps {
  calendarData: CalendarData
}

export function GraphsSection({ calendarData }: GraphsProps) {
  return (
    <section id="graphs" className="mb-10 space-y-4">
        <PNLChart dailyTradingData={calendarData} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DailyChart dailyTradingData={calendarData} />
      <EquityChart/>
      </div>
    </section>
  )
}