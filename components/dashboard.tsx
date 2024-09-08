'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { DateRange } from 'react-day-picker'
import { useFormattedTrades, useTrades } from './context/trades-data'
import { CalendarData } from '@/lib/types'
import { calculateStatistics, formatCalendarData } from '@/lib/utils'
import Statistics from './statistics'
import { GraphsSection } from './sections/graphs-section'
import { CalendarSection } from './sections/calendar-section'
import StatisticsSection from './sections/statistics-section'
import CalendarPnl from './calendar/calendar-pnl'
import { AnalyticsSection } from './sections/analytics-section'
import DateRangeSelector from './date-range-selector'

export default function Dashboard() {
  const { trades } = useTrades()
  const { formattedTrades, instruments, accountNumbers, dateRange, setInstruments, setAccountNumbers, setDateRange } = useFormattedTrades()

  const statistics = calculateStatistics(formattedTrades);
  const calendarData: CalendarData = formatCalendarData(formattedTrades);


  return (
    <div className="flex flex-col lg:flex-row min-h-screen ">
      <main className="flex-grow py-4 lg:py-6 overflow-x-hidden">
        <StatisticsSection statistics={statistics}></StatisticsSection>
        <GraphsSection calendarData={calendarData} />
        <CalendarSection calendarData={calendarData} />
      </main>
    </div>
  );
}