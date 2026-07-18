'use client'

import { Plus } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Instant navigation shell for /dashboard/connections.
 * Header copy and primary actions match the real page so client navigations
 * feel like the destination; only the data-dependent list is placeholder.
 */
export function ConnectionsPageSkeleton() {
  const t = useI18n()

  return (
    <div
      className="min-h-[calc(100vh-var(--navbar-height,4rem))] bg-[oklch(0.97_0_0)] text-[oklch(0.17_0_0)] dark:bg-[oklch(0.17_0_0)] dark:text-[oklch(0.93_0_0)]"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 md:py-14 lg:px-12">
        <header className="mb-12 md:mb-16">
          <h1 className="text-balance text-3xl font-normal tracking-[-0.04em] md:text-5xl">
            {t('connections.title')}
          </h1>
          <p className="mt-3 max-w-xl text-pretty text-base leading-relaxed text-black/55 md:text-lg dark:text-white/55">
            {t('connections.description')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-[oklch(0.22_0.01_95)] px-6 text-sm font-medium text-white opacity-70 dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              {t('connections.addConnection')}
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="inline-flex h-11 items-center justify-center rounded-sm border border-black/20 px-6 text-sm font-medium opacity-70 dark:border-white/20"
            >
              {t('connections.selectImportType')}
            </button>
          </div>
        </header>

        <div className="space-y-14 md:space-y-16" aria-hidden>
          {[0, 1, 2].map((section) => (
            <section key={section} className="space-y-2">
              <Skeleton className="h-7 w-40 rounded-sm bg-black/10 md:h-8 dark:bg-white/10" />
              <div className="divide-y divide-black/10 border-y border-black/10 dark:divide-white/10 dark:border-white/10">
                {[0, 1].map((row) => (
                  <div
                    key={row}
                    className="flex w-full items-center justify-between gap-4 py-6 md:py-8"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-2 w-2 shrink-0 rounded-full bg-black/10 dark:bg-white/10" />
                        <Skeleton className="h-7 w-48 rounded-sm bg-black/10 md:h-8 md:w-56 dark:bg-white/10" />
                      </div>
                      <Skeleton className="ml-5 h-4 w-64 max-w-full rounded-sm bg-black/5 dark:bg-white/5" />
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Skeleton className="h-8 w-8 rounded-sm bg-black/5 dark:bg-white/5" />
                      <Skeleton className="h-8 w-8 rounded-sm bg-black/5 dark:bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
