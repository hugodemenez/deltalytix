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
    <div>

      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={20} className='min-w-[300px]'>
          <FilterLeftPane />
        </ResizablePanel>
        <ResizableHandle withHandle/>
        <ResizablePanel defaultSize={80}>
          <Dashboard />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}