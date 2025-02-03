'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TradeTable from '../../components/filters/trade-table'
import FilterLeftPane from '../../components/filters/filter-left-pane'
import { DataManagementCard } from '../../components/data-management/data-management-card'
import { PropFirmOverview } from "../../components/data-management/prop-firm-overview"
import { PropFirmCard } from "../../components/data-management/prop-firm-card"

export default function DashboardPage() {
  return (

    <div className="flex w-full relative  min-h-screen py-8">
      <div className='flex flex-1 flex-col w-full p-4 '>

        <Tabs defaultValue="accounts" className="w-full">
          <TabsList>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="propfirm">Prop Firm</TabsTrigger>
          </TabsList>
          <TabsContent value="accounts">
            <DataManagementCard />
          </TabsContent>
          <TabsContent value="trades">
            <TradeTable />
          </TabsContent>
          <TabsContent value="propfirm">
            <PropFirmCard />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  )
}