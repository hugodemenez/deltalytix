'use client'

import Link from 'next/link'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'

/**
 * Second-row chrome for dashboard subpages: `← Dashboard | Title`.
 * Navbar Widgets/Table/Accounts tabs stay off these routes (home-only).
 */
export function DashboardSubpageHeader({
  title,
  backHref = '/dashboard',
  backLabel,
  className,
}: {
  title: string
  backHref?: string
  backLabel?: string
  className?: string
}) {
  const t = useI18n()
  const label = backLabel ?? t('landing.navbar.dashboard')

  return (
    <div
      className={cn(
        'flex h-12 items-center gap-4 border-b border-[#E5E5E5] px-3 text-sm dark:border-border sm:px-6 lg:px-10',
        className
      )}
    >
      <Link
        href={backHref}
        prefetch
        className="shrink-0 rounded-[4px] text-[#686D67] transition-colors hover:text-[#171717] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-muted-foreground dark:hover:text-foreground"
      >
        ← {label}
      </Link>
      <span className="text-[#A3A3A3]" aria-hidden>
        |
      </span>
      <span className="truncate font-semibold text-[#171717] dark:text-foreground">
        {title}
      </span>
    </div>
  )
}
