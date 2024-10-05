'use client'

import React, { useState, useEffect } from 'react'
import { useTrades } from './context/trades-data'
import StatisticsSection from './sections/statistics-section'
import { GraphsSection } from './sections/graphs-section'
import { CalendarSection } from './sections/calendar-section'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import ImportButton from './import-csv/import-button'
import LoadingOverlay from '@/components/loading-overlay'

export default function Dashboard() {
  return (
    <div className='flex flex-1 w-full sm:pl-[300px] '>
      <div className={`w-full flex flex-col lg:flex-row min-h-screen`}>
        <main className=" w-full py-4 lg:py-6 overflow-x-hidden">
          <StatisticsSection />
          <GraphsSection />
          <CalendarSection />
        </main>
      </div>
    </div>
  )
}