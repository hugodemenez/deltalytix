import { Skeleton } from '@/components/ui/skeleton'

/**
 * Per-component Suspense fallback for the connections list only.
 * Page chrome (title, actions) lives outside this boundary and paints instantly.
 */
export function ConnectionsListSkeleton() {
  return (
    <div className="space-y-14 md:space-y-16" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((section) => (
        <section key={section} className="space-y-3">
          <Skeleton className="h-7 w-40 rounded-sm bg-black/10 dark:bg-white/10" />
          <Skeleton className="h-24 w-full rounded-sm bg-black/5 dark:bg-white/5" />
          <Skeleton className="h-24 w-full rounded-sm bg-black/5 dark:bg-white/5" />
        </section>
      ))}
    </div>
  )
}

/** @deprecated Prefer ConnectionsListSkeleton + ConnectionsPageChrome */
export function ConnectionsPageSkeleton() {
  return <ConnectionsListSkeleton />
}
