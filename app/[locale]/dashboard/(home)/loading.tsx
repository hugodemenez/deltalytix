import { DashboardHomeChrome } from '../components/dashboard-home-chrome'
import { DashboardHomeContentSkeleton } from '../components/dashboard-home-skeleton'

/**
 * Instant Navigations shell for /dashboard — same pattern as
 * connections/loading.tsx (chrome outside, content skeleton inside).
 * Scoped to the `(home)` segment so nested routes keep their own loading UI.
 */
export default function DashboardLoading() {
  return (
    <DashboardHomeChrome>
      <DashboardHomeContentSkeleton />
    </DashboardHomeChrome>
  )
}
