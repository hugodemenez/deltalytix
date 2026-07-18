import { Suspense } from 'react'
import { connection } from 'next/server'
import { DashboardHomeSkeleton } from './components/dashboard-home-skeleton'
import DashboardHomeClient from './dashboard-home-client'

/** Opt this route into Instant Navigations validation (Cache Components). */
export const instant = true

/**
 * Heavy client UI — keep out of the prerender shell so `next build` does not
 * SSR the full widget tree (Vercel 60s static-generation budget).
 * Suspense still gives Instant Navigations a real tab chrome shell.
 */
async function DashboardPageContent() {
  await connection()
  return <DashboardHomeClient />
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardHomeSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  )
}
