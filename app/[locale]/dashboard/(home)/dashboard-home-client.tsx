'use client'

import { useEffect, useLayoutEffect } from 'react'
import { TabsContent } from '@/components/ui/tabs'
import { TradeTableReview } from '../components/tables/trade-table-review'
import { AccountsOverview } from '../components/accounts/accounts-overview'
import WidgetCanvas from '../components/widget-canvas'
import { clearReferralCode } from '@/lib/referral-storage'
import {
  type DashboardLayoutWithWidgets,
  useUserStore,
} from '@/store/user-store'

/**
 * Dashboard tab bodies — streamed/cached behind Suspense under DashboardHomeChrome.
 * Tab chrome (labels + fixed TabsList) lives outside so it paints instantly.
 *
 * `initialLayout` comes from the per-user `"use cache"` seed so Instant
 * Navigations can include a real grid shell (Connections-style), while trades
 * continue to flow from the shared DataProvider store.
 *
 * Avoid `useSearchParams` here — it suspends and would punch a hole in the
 * warm cached Instant Navigations payload.
 */
export default function DashboardHomeClient({
  initialLayout,
}: {
  initialLayout?: DashboardLayoutWithWidgets
}) {
  const setDashboardLayout = useUserStore((state) => state.setDashboardLayout)

  // Seed layout before paint when the store is empty (cold Instant Nav with
  // warm `'use cache'`). Prefer an already-warm store (e.g. localStorage /
  // DataProvider) so we do not clobber in-session edits.
  useLayoutEffect(() => {
    if (!initialLayout) return
    const existing = useUserStore.getState().dashboardLayout
    if (!existing) {
      setDashboardLayout(initialLayout)
    }
  }, [initialLayout, setDashboardLayout])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      clearReferralCode()
    }
  }, [])

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
