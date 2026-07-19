import { Suspense } from 'react'
import { getUserId } from '@/server/auth'
import { DashboardHomeChrome } from '../components/dashboard-home-chrome'
import { DashboardHomeContentSkeleton } from '../components/dashboard-home-skeleton'
import { CachedDashboardHome } from './components/cached-dashboard-home'

/** Opt this route into Instant Navigations validation (Cache Components). */
export const instant = true

/**
 * Prefetch with the user session so warm `'use cache'` layout UI can be part
 * of the instant navigation (not only the content Suspense skeleton).
 */
export const prefetch = 'allow-runtime'

/**
 * Resolve auth outside `'use cache'`, then render the tagged cached home UI.
 * Cold cache → content skeleton under the instant chrome.
 * Warm cache → layout-seeded client UI included instantly (no skeleton).
 */
async function DashboardPageContent() {
  const userId = await getUserId()
  return <CachedDashboardHome userId={userId} />
}

/**
 * Per-component Instant Navigations (same model as Connections):
 * - Chrome (real tab labels) is outside Suspense → paints once
 * - Tab bodies stream behind Suspense, or resolve from `'use cache'`
 * - `loading.tsx` shows the same chrome + skeleton on navigate
 */
export default function DashboardPage() {
  return (
    <DashboardHomeChrome>
      <Suspense fallback={<DashboardHomeContentSkeleton />}>
        <DashboardPageContent />
      </Suspense>
    </DashboardHomeChrome>
  )
}
