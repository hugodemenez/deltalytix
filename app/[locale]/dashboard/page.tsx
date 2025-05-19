'use client'

import { Suspense } from 'react'
import WidgetCanvas from './components/widget-canvas'
import { Skeleton } from "@/components/ui/skeleton"

export default function Home() {
  return (
    <div className="flex w-full relative min-h-screen">
      <div className='flex flex-1 w-full'>
        <div className={`w-full flex flex-col lg:flex-row min-h-screen`}>
          <main className="w-full py-6 lg:py-8 overflow-x-hidden">
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <WidgetCanvas />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  )
}