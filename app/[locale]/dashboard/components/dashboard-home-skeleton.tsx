'use client'

import { useI18n } from '@/locales/client'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Instant Navigations shell for /dashboard.
 * Tab chrome matches the real page; widget tiles are placeholders until the
 * heavy client tree streams in (deferred with connection() for build budget).
 */
export function DashboardHomeSkeleton() {
  const t = useI18n()

  return (
    <main
      className="overflow-x-hidden"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full pt-(--tabs-height,3rem)">
        <div className="fixed inset-x-0 top-(--navbar-height,5rem) z-30 w-full overflow-x-auto border-b bg-background shadow-xs">
          <div className="flex h-12 w-full min-w-max max-w-none items-center gap-1 bg-muted/70 px-2 sm:min-w-0">
            <span className="inline-flex h-9 items-center rounded-sm bg-background px-3 text-sm font-medium shadow-sm">
              {t('dashboard.tabs.widgets')}
            </span>
            <span className="inline-flex h-9 items-center rounded-sm px-3 text-sm font-medium text-muted-foreground">
              {t('dashboard.tabs.table')}
            </span>
            <span className="inline-flex h-9 items-center rounded-sm px-3 text-sm font-medium text-muted-foreground">
              {t('dashboard.tabs.accounts')}
            </span>
          </div>
        </div>

        <div
          className="grid min-w-0 grid-cols-1 gap-3 overflow-hidden px-0 pt-4 sm:grid-cols-2 sm:px-4 lg:grid-cols-3"
          aria-hidden
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="flex min-h-[180px] flex-col gap-3 rounded-sm border border-border/60 bg-background/60 p-4"
            >
              <Skeleton className="h-4 w-28 rounded-sm" />
              <Skeleton className="h-8 w-20 rounded-sm" />
              <Skeleton className="mt-auto h-24 w-full rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
