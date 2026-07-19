'use client'

import { useSyncExternalStore } from 'react'
import { DashboardHomeContentSkeleton } from '../components/dashboard-home-skeleton'
import DashboardHomeClient from './dashboard-home-client'

const subscribe = () => () => {}

/**
 * Client-first dashboard tab bodies for Instant Navigations.
 *
 * Connections can include a warm per-user `"use cache"` RSC payload in the
 * instant navigation. Dashboard tab bodies are hydrated from DataProvider /
 * Zustand instead — there is no equivalent cached list UI yet.
 *
 * Strategy:
 * - Server / prerender: render the light skeleton only (keeps Cache Components
 *   from SSR-ing the full widget tree and blowing the static-generation budget).
 * - Client: mount the real tab bodies immediately from the already-warm store
 *   (e.g. after visiting /connections under the same dashboard layout).
 *
 * This removes the soft-nav wait on `await connection()` + Suspense streaming
 * that previously left the skeleton up until a dynamic RSC round-trip finished.
 */
export function DashboardHomeContent() {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false)

  if (!isClient) {
    return <DashboardHomeContentSkeleton />
  }

  return <DashboardHomeClient />
}
