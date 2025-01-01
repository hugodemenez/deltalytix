'use server'
import FilterLeftPane from '../components/filters/filter-left-pane'
import WidgetCanvas from '../components/widget-canvas'

export default async function Home() {
  return (
    <div className="flex w-full relative  min-h-screen">
      <FilterLeftPane />
      <div className='flex flex-1 w-full '>
        <div className={`w-full flex flex-col lg:flex-row min-h-screen`}>
          <main className=" w-full py-6 lg:py-8 overflow-x-hidden">
            <WidgetCanvas />
          </main>
        </div>
      </div>
    </div>
  )
}