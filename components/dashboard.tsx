'use client'

import React, { useState, useEffect } from 'react'
import { useTrades } from './context/trades-data'
import StatisticsSection from './sections/statistics-section'
import { GraphsSection } from './sections/graphs-section'
import { CalendarSection } from './sections/calendar-section'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import ImportButton from './import-csv/import-button'
import LoadingOverlay from '@/components/loading-overlay'

/**
* Renders the main dashboard components within a flex container.
* @example
* <Dashboard />
* <div className='flex ...'>...</div>
* @returns {ReactElement} Returns a React element containing the dashboard layout and sections.
* @description
*   - Designed to be used within a React component tree.
*   - Uses Tailwind CSS classes for styling the layout.
*   - Responsible for the overall arrangement of the Statistics, Calendar, and Graphs sections.
*/
export default function Dashboard() {
  return (
    <div className='flex flex-1 w-full sm:pl-[300px] '>
      <div className={`w-full flex flex-col lg:flex-row min-h-screen`}>
        <main className=" w-full py-4 lg:py-6 overflow-x-hidden">
          <StatisticsSection />
          <CalendarSection />
          <GraphsSection />
        </main>
      </div>
    </div>
  )
}