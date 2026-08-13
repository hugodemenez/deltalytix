'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataManagementCard } from "@/app/[locale]/dashboard/data/components/data-management/data-management-card"
import { useEffect } from "react"
import { TradeTableReview } from "../components/tables/trade-table-review"
import { DashboardSubpageHeader } from "../components/dashboard-subpage-header"
import { useI18n } from "@/locales/client"

export default function DashboardPage() {
  const t = useI18n()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="relative min-h-[calc(100dvh-var(--navbar-height,4rem))] w-full bg-[#FAFAFA] dark:bg-background">
      <DashboardSubpageHeader title={t('dashboard.data')} titleAsHeading />
      <div className="flex w-full flex-1 flex-col p-4 py-8">
        <Tabs defaultValue="accounts" className="w-full">
          <TabsList>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            {/* <TabsTrigger value="propfirm">Prop Firm</TabsTrigger> */}
          </TabsList>
          <TabsContent value="accounts">
            <DataManagementCard />
          </TabsContent>
          <TabsContent value="trades" className="h-[calc(100vh-var(--navbar-height)-var(--tabs-height)-16px)] p-4">
            <TradeTableReview />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  )
}