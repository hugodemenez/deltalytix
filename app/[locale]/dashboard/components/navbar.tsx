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
import { PlanChip } from './plan-chip'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useDashboardHomeTabsStore,
  type DashboardHomeTab,
} from '@/store/dashboard-home-tabs-store'

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
  const navRef = useRef<HTMLElement>(null)
  const activeTab = useDashboardHomeTabsStore((state) => state.activeTab)
  const setActiveTab = useDashboardHomeTabsStore((state) => state.setActiveTab)
  const subpage = resolveDashboardSubpage(pathname)
  const showHomeTabs = isDashboardHomePath(pathname)

  // Initialize keyboard shortcuts
  useKeyboardShortcuts()

  // Dashboard lives inside a closed logo popover, so its Link is not in the DOM
  // on /connections and Partial Prefetching never warms the route. Prefetch
  // dashboard explicitly so Instant Navigations stay warm.
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
      <div className="relative flex h-16 items-center justify-between gap-3 px-3 py-2 sm:gap-4 sm:px-6 lg:px-10">
        <Link
          href="/dashboard"
          prefetch
          aria-label={t('landing.navbar.logo.dashboard')}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] transition-colors hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Logo className="h-6 w-6 fill-black dark:fill-white" />
        </Link>

        {showHomeTabs && (
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as DashboardHomeTab)
            }
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <TabsList
              aria-label={t('dashboard.tabs.ariaLabel')}
              className="h-9 rounded-[4px] bg-[#F5F5F5] p-1 dark:bg-muted"
            >
              <TabsTrigger
                value="widgets"
                className="h-7 rounded-[3px] px-2.5 text-xs tracking-[-0.01em] sm:px-3 sm:text-sm"
              >
                {t('dashboard.tabs.widgets')}
              </TabsTrigger>
              <TabsTrigger
                value="table"
                className="h-7 rounded-[3px] px-2.5 text-xs tracking-[-0.01em] sm:px-3 sm:text-sm"
              >
                {t('dashboard.tabs.table')}
              </TabsTrigger>
              <TabsTrigger
                value="accounts"
                className="hidden h-7 rounded-[3px] px-2.5 text-xs tracking-[-0.01em] sm:inline-flex sm:px-3 sm:text-sm"
              >
                {t('dashboard.tabs.accounts')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <ReferralButton />
          </div>
          <PlanChip />
          <UserMenu />
        </div>
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
