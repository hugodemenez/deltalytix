import { DashboardHomeChrome } from '../components/dashboard-home-chrome'
import { DashboardHomeContent } from './dashboard-home-content'

/**
 * Soft-navigation shell for /dashboard — same chrome + client-first content
 * boundary as `page.tsx`. After hydrate, warm DataProvider state paints
 * widgets immediately (no skeleton wait for a dynamic RSC round-trip).
 */
export default function DashboardLoading() {
  return (
    <DashboardHomeChrome>
      <DashboardHomeContent />
    </DashboardHomeChrome>
  )
}
