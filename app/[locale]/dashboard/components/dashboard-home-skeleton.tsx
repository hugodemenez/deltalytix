import { Skeleton } from '@/components/ui/skeleton'

/**
 * Per-component Suspense fallback for dashboard tab bodies only.
 * Tab chrome lives outside this boundary (DashboardHomeChrome) and paints
 * instantly — same Instant Navigations model as ConnectionsListSkeleton.
 *
 * Shape mirrors WidgetCanvas's CanvasSkeleton (toolbar strip + widget tiles).
 */
export function DashboardHomeContentSkeleton() {
  return (
    <div
      className="min-w-0 overflow-hidden px-0 max-md:h-[calc(100dvh-var(--navbar-height,5rem)-var(--tabs-height,3rem))] sm:px-4"
      aria-busy="true"
      aria-live="polite"
    >
      <div
        className="relative w-full overflow-hidden md:mt-6 md:min-h-screen md:overflow-visible md:pb-16 max-md:[height:calc(100dvh-var(--navbar-height,5rem)-var(--tabs-height,3rem)-var(--mobile-toolbar-top,5.5rem))]"
        aria-hidden
      >
        {/* Toolbar placeholder — matches Toolbar's top action strip */}
        <div className="mb-3 flex items-center justify-end gap-2 px-4 sm:px-0 md:mb-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md max-md:hidden" />
        </div>

        <div className="flex h-full min-h-[16rem] w-full flex-col gap-4 p-4 md:p-0">
          <Skeleton className="h-24 w-full rounded-lg" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg max-md:hidden" />
          </div>
          <Skeleton className="h-32 w-full rounded-lg max-md:hidden" />
        </div>
      </div>
    </div>
  )
}

/** @deprecated Prefer DashboardHomeContentSkeleton + DashboardHomeChrome */
export function DashboardHomeSkeleton() {
  return <DashboardHomeContentSkeleton />
}
