'use server'
import { CalendarSection } from '../components/sections/calendar-section'
import { GraphsSection } from '../components/sections/graphs-section'
import StatisticsSection from '../components/sections/statistics-section'
import FilterLeftPane from '../components/filters/filter-left-pane'

export default async function Home() {
  return (
    <div className="flex w-full relative  min-h-screen">
      <FilterLeftPane />
      <div className='flex flex-1 w-full sm:pl-[300px] '>
        <div className={`w-full flex flex-col lg:flex-row min-h-screen`}>
          <main className=" w-full py-4 lg:py-6 overflow-x-hidden">
            <StatisticsSection />
            <CalendarSection />
            <GraphsSection />
          </main>
        </div>
      </div>
    </div>
  )
}