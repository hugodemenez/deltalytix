'use client'

import React, { useState, useEffect } from 'react'
import { useFormattedTrades, useTrades } from './context/trades-data'
import { CalendarData } from '@/lib/types'
import { calculateStatistics, formatCalendarData } from '@/lib/utils'
import StatisticsSection from './sections/statistics-section'
import { GraphsSection } from './sections/graphs-section'
import { CalendarSection } from './sections/calendar-section'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import ImportButton from './import-csv/import-button'
import LoadingOverlay from '@/components/loading-overlay'

export default function Dashboard() {
  const { trades, isLoading } = useTrades()
  const { formattedTrades } = useFormattedTrades()

  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setIsDialogOpen(trades.length === 0)
    }
  }, [isLoading, trades.length])

  const statistics = calculateStatistics(formattedTrades)
  const calendarData: CalendarData = formatCalendarData(formattedTrades)

  return (
    <>
      {isLoading && <LoadingOverlay />}
      <div className={`flex flex-col lg:flex-row min-h-screen ${isDialogOpen ? 'blur-sm' : ''}`}>
        <main className="flex-grow py-4 lg:py-6 overflow-x-hidden">
          <StatisticsSection statistics={statistics} />
          <GraphsSection calendarData={calendarData} />
          <CalendarSection calendarData={calendarData} />
        </main>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Trades Available</DialogTitle>
            <DialogDescription>
              There are currently no trades to display. Please add some trades to see the dashboard content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <ImportButton />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}