'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TradeTable from "@/app/[locale]/dashboard/data/components/data-management/trade-table"
import { DataManagementCard } from "@/app/[locale]/dashboard/data/components/data-management/data-management-card"
import { useEffect } from "react"

export default function DashboardPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (

    <div className="flex w-full relative  min-h-screen py-8">
      <div className='flex flex-1 flex-col w-full p-4 '>

        <Tabs defaultValue="accounts" className="w-full">
          <TabsList>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            {/* <TabsTrigger value="propfirm">Prop Firm</TabsTrigger> */}
          </TabsList>
          <TabsContent value="accounts">
            <DataManagementCard />
          </TabsContent>
          <TabsContent value="trades">
            <TradeTable />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  )
}