import { cacheLife, cacheTag } from 'next/cache'
import {
  dashboardHomeCacheTag,
  loadDashboardHomeDataForUser,
} from '../dashboard-home-data'
import DashboardHomeClient from '../dashboard-home-client'

/**
 * Per-user cached Dashboard home UI (chrome lives outside Suspense).
 *
 * Instant Navigations (same model as Connections):
 * - Cold cache → content Suspense skeleton under the instant chrome
 * - Warm `'use cache'` → layout-seeded client UI reused across requests
 *   (included in `prefetch = 'allow-runtime'` when the session is known)
 *
 * Trades/accounts still hydrate from DataProvider; this cache makes the
 * widget grid structure part of the instant payload so soft nav does not
 * wait on a dynamic RSC hole.
 */
export async function CachedDashboardHome({ userId }: { userId: string }) {
  'use cache'
  cacheTag(dashboardHomeCacheTag(userId))
  cacheLife('minutes')

  const initialLayout = await loadDashboardHomeDataForUser(userId)
  return <DashboardHomeClient initialLayout={initialLayout} />
}
