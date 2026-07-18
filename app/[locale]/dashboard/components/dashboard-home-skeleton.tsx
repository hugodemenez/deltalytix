import { Skeleton } from '@/components/ui/skeleton'
import { MOBILE_CAROUSEL_HEIGHT } from '@/lib/widget-carousel'

/**
 * Per-component Suspense / loading.tsx fallback for dashboard tab bodies.
 * Tab chrome lives outside this boundary (DashboardHomeChrome).
 *
 * Mobile matches the loaded WidgetCanvas carousel (full-height slide + bottom
 * toolbar). Desktop matches the grid CanvasSkeleton.
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
 * `isMobile` is still resolving — keeps both paths visually identical.
 */
export function WidgetCanvasSkeleton() {
  return (
    <div className="relative w-full" aria-hidden>
      {/* Mobile: full-viewport carousel slide + floating bottom toolbar */}
      <div
        className="relative w-full overflow-hidden md:hidden"
        style={{ height: MOBILE_CAROUSEL_HEIGHT }}
      >
        <div className="h-full w-full px-2 pb-2">
          <div className="flex h-full w-full min-h-0 flex-col gap-3 rounded-lg bg-background p-4 shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
            <Skeleton className="h-4 w-28 rounded-sm" />
            <Skeleton className="h-8 w-24 rounded-sm" />
            <Skeleton className="mt-auto h-full min-h-[12rem] w-full rounded-lg" />
          </div>
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-10 mx-auto flex w-full max-w-[calc(100vw-1rem)] justify-center px-2">
          <div className="flex items-center justify-center gap-2 rounded-3xl border bg-background/95 px-2.5 py-2 shadow-lg">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          </div>
        </div>
      </div>

      {/* Desktop: toolbar strip + multi-tile grid */}
      <div className="relative hidden w-full md:mt-6 md:block md:min-h-screen md:pb-16">
        <div className="mb-4 flex items-center justify-end gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <div className="flex h-full min-h-[16rem] w-full flex-col gap-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/** @deprecated Prefer DashboardHomeContentSkeleton + DashboardHomeChrome */
export function DashboardHomeSkeleton() {
  return <DashboardHomeContentSkeleton />
}
