// Graphs.tsx
import React from 'react'
import DailyChart from '../charts/long-short-chart'
import PNLChart from '../charts/pnl-bar-chart'
import EquityChart from '../charts/equity-chart'
import WeekdayPNLChart from '../charts/weekday-pnl'
import TimeOfDayTradeChart from '../charts/pnl-time-bar-chart'

export function GraphsSection() {

  return (
    <section id="graphs" className="mb-10 space-y-4">
      <PNLChart />
      <EquityChart />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <WeekdayPNLChart/>
        <TimeOfDayTradeChart/>
      </div>
    </section>
  )
}