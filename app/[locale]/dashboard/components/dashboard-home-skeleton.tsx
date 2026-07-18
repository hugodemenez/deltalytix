import { Skeleton } from '@/components/ui/skeleton'
import { MOBILE_CAROUSEL_HEIGHT } from '@/lib/widget-carousel'

/**
 * Per-component Suspense / loading.tsx fallback for dashboard tab bodies.
 * Tab chrome + floating Toolbar live outside this boundary
 * (DashboardHomeChrome / WidgetToolbarHost). Content only here.
 */
export function DashboardHomeContentSkeleton() {
  return (
    <div
      className="min-w-0 overflow-hidden px-0 max-md:h-[calc(100dvh-var(--navbar-height,5rem)-var(--tabs-height,3rem))] sm:px-4"
      aria-busy="true"
      aria-live="polite"
    >
      <WidgetCanvasSkeleton />
    </div>
  )
}

/**
 * Shared widget-area skeleton used by Instant Nav and WidgetCanvas while
 * `isMobile` is still resolving. Toolbar is chrome; not duplicated here.
 *
 * Desktop is a single full-page surface — we do not invent a tile grid
 * because widget count/size/layout are unknown until layouts load.
 */
export function WidgetCanvasSkeleton() {
  return (
    <div className="relative w-full" aria-hidden>
      {/* Mobile: full-viewport carousel slide */}
      <div
        className="relative w-full overflow-hidden md:hidden"
        style={{ height: MOBILE_CAROUSEL_HEIGHT }}
      >
        <div className="h-full w-full px-2 pb-2">
          <Skeleton className="h-full min-h-[12rem] w-full rounded-lg" />
        </div>
      </div>

      {/* Desktop: one full-page placeholder (no fake widget tiles) */}
      <div className="relative hidden w-full md:mt-6 md:block md:min-h-screen md:pb-16">
        <Skeleton className="min-h-[min(70vh,40rem)] w-full rounded-lg md:min-h-[calc(100dvh-var(--navbar-height,5rem)-var(--tabs-height,3rem)-6rem)]" />
      </div>
    </div>
  )
}

/** @deprecated Prefer DashboardHomeContentSkeleton + DashboardHomeChrome */
export function DashboardHomeSkeleton() {
  return <DashboardHomeContentSkeleton />
}
