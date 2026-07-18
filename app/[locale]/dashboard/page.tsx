import { Suspense } from 'react'
import { connection } from 'next/server'
import { DashboardHomeChrome } from './components/dashboard-home-chrome'
import { DashboardHomeContentSkeleton } from './components/dashboard-home-skeleton'
import DashboardHomeClient from './dashboard-home-client'

/** Opt this route into Instant Navigations validation (Cache Components). */
export const instant = true

/**
 * Prefetch with the user session so Instant Navigations can include the
 * chrome + any warm runtime payload (content still streams via Suspense).
 *
 * Unlike Connections, dashboard tab bodies are client-hydrated from
 * DataProvider — there is no per-user `"use cache"` list UI to reuse yet.
 */
export const prefetch = 'allow-runtime'

/**
 * Heavy client UI — keep out of the prerender shell so `next build` does not
 * SSR the full widget tree (Vercel 60s static-generation budget).
 * Tab chrome stays outside Suspense; only tab bodies stream here.
 */
async function DashboardPageContent() {
  await connection()
  return <DashboardHomeClient />
}

/**
 * Per-component Instant Navigations (same model as Connections):
 * - Chrome (real tab labels) is outside Suspense → paints once
 * - Tab bodies stream behind their own Suspense skeleton
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
