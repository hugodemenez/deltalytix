'use server'
import Dashboard from '@/components/dashboard'
import FilterLeftPane from '@/components/filters/filter-left-pane'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"



export default async function Home() {

  return (
    <div className="flex w-full relative  min-h-screen">
      <FilterLeftPane />
      <Dashboard />
    </div>
  )
}