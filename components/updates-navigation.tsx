'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UpdatesNavigationProps {
  previous: { slug: string; title: string } | null
  next: { slug: string; title: string } | null
  locale: string
  position?: 'top' | 'bottom'
}

const labels = {
  en: { newer: 'Newer', older: 'Older' },
  fr: { newer: 'Plus récent', older: 'Plus ancien' },
} as const

export function UpdatesNavigation({ previous, next, locale, position = 'bottom' }: UpdatesNavigationProps) {
  if (!previous && !next) {
    return null
  }

  const t = labels[locale as keyof typeof labels] || labels.en

  return (
    <nav className={`flex items-center justify-between gap-4 ${position === 'top' ? 'mb-8 pb-8 border-b' : 'mt-12 pt-8 border-t'} border-neutral-200 dark:border-neutral-800`} aria-label="Update navigation">
      <div className="flex-1 min-w-0">
        {next ? (
          <Link href={`/${locale}/updates/${next.slug}`} className="group block">
            <Button variant="ghost" className="h-auto p-4 w-full justify-start text-left">
              <div className="flex items-center gap-3 min-w-0">
                <ChevronLeft className="h-5 w-5 flex-shrink-0 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
                <div className="min-w-0">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 block">{t.newer}</span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate block">
                    {next.title}
                  </span>
                </div>
              </div>
            </Button>
          </Link>
        ) : (
          <div />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {previous ? (
          <Link href={`/${locale}/updates/${previous.slug}`} className="group block">
            <Button variant="ghost" className="h-auto p-4 w-full justify-end text-right">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 block">{t.older}</span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate block">
                    {previous.title}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
              </div>
            </Button>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </nav>
  )
}
