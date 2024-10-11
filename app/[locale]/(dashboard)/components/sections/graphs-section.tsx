// Graphs.tsx
import React from 'react'
import EquityChart from '../charts/equity-chart'
import CommissionsPnLChart from '../charts/commissions-pnl'
import ContractQuantityChart from '../charts/contract-quantity'
import PNLChart from '../charts/pnl-bar-chart'
import PnLBySideChart from '../charts/pnl-by-side'
import TimeOfDayTradeChart from '../charts/pnl-time-bar-chart'
import TimeInPositionChart from '../charts/time-in-position'
import WeekdayPNLChart from '../charts/weekday-pnl'

export function GraphsSection() {

  return (
    <section id="graphs" className="mb-10 space-y-4">
      <EquityChart />
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <TimeOfDayTradeChart/>
        <TimeInPositionChart/>
        <ContractQuantityChart/>
      </div>
      <PNLChart />
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <PnLBySideChart/>
        <WeekdayPNLChart/>
        <CommissionsPnLChart/>
      </div>
    </section>
  )
}