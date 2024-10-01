// Graphs.tsx
import React from 'react'
import DailyChart from '../charts/long-short-chart'
import PNLChart from '../charts/pnl-bar-chart'
import EquityChart from '../charts/equity-chart'
import WeekdayPNLChart from '../charts/weekday-pnl'
import TimeOfDayTradeChart from '../charts/pnl-time-bar-chart'
import PnLBySideChart from '../charts/pnl-by-side'
import CommissionsPnLChart from '../charts/commissions-pnl'
import TimeInPositionChart from '../charts/time-in-position'
import ContractQuantityChart from '../charts/contract-quantity'

export function GraphsSection() {

  return (
    <section id="graphs" className="mb-10 space-y-4">
      <EquityChart />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TimeOfDayTradeChart/>
        <TimeInPositionChart/>
        <ContractQuantityChart/>
      </div>
      <PNLChart />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PnLBySideChart/>
        <WeekdayPNLChart/>
        <CommissionsPnLChart/>
      </div>
    </section>
  )
}