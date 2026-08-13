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
  titleAsHeading = false,
  className,
}: {
  title: string
  backHref?: string
  backLabel?: string
  titleAsHeading?: boolean
  className?: string
}) {
  const t = useI18n()
  const label = backLabel ?? t('landing.navbar.dashboard')
  const TitleTag = titleAsHeading ? 'h1' : 'p'

  return (
    <div
      className={cn(
        'flex h-12 items-center gap-3 border-b border-[#E5E5E5] px-4 text-sm dark:border-border sm:px-6 lg:px-10',
        className
      )}
    >
      <Link
        href={backHref}
        className="shrink-0 text-[#686D67] transition-colors hover:text-[#171717] dark:text-muted-foreground dark:hover:text-foreground"
      >
        ← {label}
      </Link>
      <span className="text-[#A3A3A3]" aria-hidden>
        |
      </span>
      <TitleTag className="truncate text-base font-semibold tracking-[-0.02em] text-[#171717] dark:text-foreground">
        {title}
      </TitleTag>
    </div>
  )
}
