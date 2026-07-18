'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { TabsContent } from '@/components/ui/tabs'
import { TradeTableReview } from './components/tables/trade-table-review'
import { AccountsOverview } from './components/accounts/accounts-overview'
import WidgetCanvas from './components/widget-canvas'
import { clearReferralCode } from '@/lib/referral-storage'

/**
 * Dashboard tab bodies — streamed behind Suspense under DashboardHomeChrome.
 * Tab chrome (labels + fixed TabsList) lives outside so it paints instantly.
 */
export default function DashboardHomeClient() {
  const searchParams = useSearchParams()

  // Clear referral code after successful subscription
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      clearReferralCode()
    }
  }, [searchParams])

  return (
    <>
      <TabsContent
        value="table"
        className="h-[calc(100dvh-var(--navbar-height,5rem)-var(--tabs-height,3rem)-16px)] min-w-0 p-2 sm:p-4"
      >
        <TradeTableReview />
      </TabsContent>

      <TabsContent
        value="accounts"
        className="h-[calc(100dvh-var(--navbar-height,5rem)-var(--tabs-height,3rem)-16px)] min-w-0 mt-0"
      >
        <AccountsOverview size="large" />
      </TabsContent>

      <TabsContent
        value="widgets"
        className="min-w-0 overflow-hidden px-0 max-md:h-[calc(100dvh-var(--navbar-height,5rem)-var(--tabs-height,3rem))] sm:px-4"
      >
        <WidgetCanvas />
      </TabsContent>
    </>
  )
}
