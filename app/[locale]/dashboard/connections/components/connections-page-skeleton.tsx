import { Skeleton } from '@/components/ui/skeleton'

/**
 * Instant navigation shell for /dashboard/connections.
 * Mirrors the page chrome so client navigations paint immediately while
 * connection data streams in behind Suspense.
 */
export function ConnectionsPageSkeleton() {
  return (
    <div
      className="min-h-[calc(100vh-var(--navbar-height,4rem))] bg-[oklch(0.97_0_0)] text-[oklch(0.17_0_0)] dark:bg-[oklch(0.17_0_0)] dark:text-[oklch(0.93_0_0)]"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 md:py-14 lg:px-12">
        <header className="mb-12 md:mb-16">
          <Skeleton className="h-9 w-56 rounded-sm bg-black/10 md:h-12 md:w-72 dark:bg-white/10" />
          <Skeleton className="mt-3 h-5 w-full max-w-xl rounded-sm bg-black/10 dark:bg-white/10" />
          <Skeleton className="mt-2 h-5 w-2/3 max-w-md rounded-sm bg-black/10 dark:bg-white/10" />
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Skeleton className="h-11 w-40 rounded-sm bg-black/10 dark:bg-white/10" />
            <Skeleton className="h-11 w-28 rounded-sm bg-black/10 dark:bg-white/10" />
          </div>
        </header>

        <div className="space-y-14 md:space-y-16">
          {[0, 1, 2].map((section) => (
            <section key={section} className="space-y-3">
              <Skeleton className="h-7 w-40 rounded-sm bg-black/10 dark:bg-white/10" />
              <Skeleton className="h-24 w-full rounded-sm bg-black/5 dark:bg-white/5" />
              <Skeleton className="h-24 w-full rounded-sm bg-black/5 dark:bg-white/5" />
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
