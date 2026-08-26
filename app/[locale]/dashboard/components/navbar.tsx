'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { Logo } from '@/components/logo'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useI18n } from "@/locales/client"
import {
  isDashboardHomePath,
  resolveDashboardSubpage,
  type DashboardSubpage,
} from '@/lib/dashboard-subpage'
import { useKeyboardShortcuts } from '../../../../hooks/use-keyboard-shortcuts'
import { DashboardSubpageHeader } from './dashboard-subpage-header'
import UserMenu from './user-menu'
import ReferralButton from './referral-button'
import { DashboardViewTabs } from './dashboard-view-tabs'
import { FilterCommandMenu } from './filters/filter-command-menu'
import { ShareButton } from './share-button'
import { useIsMobile } from '@/hooks/use-mobile'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useUserStore } from '@/store/user-store'

function subpageTitle(
  subpage: DashboardSubpage,
  t: ReturnType<typeof useI18n>
) {
  switch (subpage) {
    case 'connections':
      return t('connections.title')
    case 'data':
      return t('dashboard.data')
    case 'settings':
      return t('dashboard.settings')
    case 'billing':
      return t('dashboard.billingSheet.title')
  }
}

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const t = useI18n()
  const isMobile = useIsMobile()
  const compactHomeFilters = useMediaQuery('(max-width: 1023px)')
  const navRef = useRef<HTMLElement>(null)
  const subpage = resolveDashboardSubpage(pathname)
  const showHomeChrome = isDashboardHomePath(pathname)
  const dashboardLayout = useUserStore((state) => state.dashboardLayout)

  useKeyboardShortcuts()

  useEffect(() => {
    router.prefetch('/dashboard')
  }, [router])

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return

    const applyHeight = () => {
      document.documentElement.style.setProperty(
        '--navbar-height',
        `${nav.offsetHeight}px`
      )
    }

    applyHeight()
    const observer = new ResizeObserver(applyHeight)
    observer.observe(nav)
    return () => observer.disconnect()
  }, [subpage])

  return (
    <nav
      ref={navRef}
      className="sticky top-0 left-0 right-0 z-40 flex w-full flex-col border-b border-[#E5E5E5] bg-white pt-safe text-primary dark:border-border dark:bg-background"
    >
      <div className="relative flex flex-col sm:h-14">
        <div className="flex h-14 items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-6 lg:px-10">
          <div className="z-10 flex min-w-0 items-center gap-2">
            <Link
              href="/dashboard"
              prefetch
              aria-label={t('landing.navbar.logo.dashboard')}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] transition-colors hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Logo className="h-5 w-5 fill-black dark:fill-white" />
            </Link>
            {showHomeChrome ? (
              <FilterCommandMenu
                variant="navbar"
                compact={compactHomeFilters}
              />
            ) : null}
          </div>

          <div className="z-10 flex shrink-0 items-center gap-2">
            {!isMobile ? <ReferralButton /> : null}
            <ShareButton
              appearance="navbar"
              currentLayout={
                dashboardLayout
                  ? {
                      desktop: dashboardLayout.desktop,
                      mobile: dashboardLayout.mobile,
                    }
                  : undefined
              }
            />
            <UserMenu />
          </div>
        </div>

        {showHomeChrome ? (
          <div className="flex justify-center px-3 pb-2 sm:pointer-events-none sm:absolute sm:inset-0 sm:px-0 sm:pb-0 sm:items-center">
            <DashboardViewTabs className="sm:pointer-events-auto" />
          </div>
        ) : null}
      </div>
      {subpage ? (
        <DashboardSubpageHeader
          title={subpageTitle(subpage, t)}
          className="border-b-0 border-t"
        />
      ) : null}
    </nav>
  )
}
