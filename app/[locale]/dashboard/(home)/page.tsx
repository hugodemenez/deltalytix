import { DashboardHomeChrome } from '../components/dashboard-home-chrome'
import { DashboardHomeContent } from './dashboard-home-content'

/** Opt this route into Instant Navigations validation (Cache Components). */
export const instant = true

/**
 * Prefetch with the user session so Instant Navigations can include the
 * chrome. Tab bodies paint client-side from DataProvider (see
 * `dashboard-home-content.tsx`) — unlike Connections, there is no per-user
 * `"use cache"` payload to reuse for widget content yet.
 */
export const prefetch = 'allow-runtime'

/**
 * Per-component Instant Navigations (same chrome model as Connections):
 * - Chrome (real tab labels) is outside the content boundary → paints once
 * - Tab bodies are client-first: skeleton only during prerender/SSR, then
 *   immediate mount from the warm Zustand store on soft navigation
 * - `loading.tsx` uses the same chrome + content boundary
 *
 * Do not wrap tab bodies in `await connection()` + Suspense here. That pattern
 * protects the static-generation budget for other heavy pages, but on this
 * route it forced every soft navigation to wait on a dynamic RSC stream even
 * when DataProvider was already warm (e.g. navigating back from /connections).
 */
export default function DashboardPage() {
  return (
    <DashboardHomeChrome>
      <DashboardHomeContent />
    </DashboardHomeChrome>
  )
}
