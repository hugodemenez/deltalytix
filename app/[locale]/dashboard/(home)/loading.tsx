import { DashboardHomeChrome } from '../components/dashboard-home-chrome'
import { DashboardHomeContentSkeleton } from '../components/dashboard-home-skeleton'

/**
 * Instant Navigations shell for /dashboard — same pattern as
 * connections/loading.tsx (chrome outside, content skeleton inside).
 * Warm `'use cache'` skips this for the content hole once prefetched.
 */
export default function DashboardLoading() {
  return (
    <DashboardHomeChrome>
      <DashboardHomeContentSkeleton />
    </DashboardHomeChrome>
  )
}
