'use client'

import { useCallback, useRef } from 'react'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import {
  useDashboardHomeTabsStore,
  type DashboardHomeTab,
} from '@/store/dashboard-home-tabs-store'

export const DASHBOARD_VIEW_TAB_IDS = {
  widgets: 'dashboard-view-tab-widgets',
  table: 'dashboard-view-tab-table',
  accounts: 'dashboard-view-tab-accounts',
} as const

export const DASHBOARD_VIEW_PANEL_IDS = {
  widgets: 'dashboard-view-panel-widgets',
  table: 'dashboard-view-panel-table',
  accounts: 'dashboard-view-panel-accounts',
} as const

const VIEWS: DashboardHomeTab[] = ['widgets', 'table', 'accounts']

function viewLabel(
  view: DashboardHomeTab,
  t: ReturnType<typeof useI18n>
) {
  if (view === 'table') return t('dashboard.tabs.table')
  if (view === 'accounts') return t('dashboard.tabs.accounts')
  return t('dashboard.tabs.widgets')
}

function isRtl(element: HTMLElement) {
  return getComputedStyle(element).direction === 'rtl'
}

export function DashboardViewTabs({ className }: { className?: string }) {
  const t = useI18n()
  const activeTab = useDashboardHomeTabsStore((state) => state.activeTab)
  const setActiveTab = useDashboardHomeTabsStore((state) => state.setActiveTab)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const focusTab = useCallback(
    (index: number) => {
      const next = (index + VIEWS.length) % VIEWS.length
      tabRefs.current[next]?.focus()
      setActiveTab(VIEWS[next])
    },
    [setActiveTab]
  )

  return (
    <div
      role="tablist"
      aria-label={t('dashboard.tabs.ariaLabel')}
      className={cn(
        'inline-flex items-center gap-1 rounded-[10px] bg-[#F5F5F5] p-[3px] dark:bg-muted',
        className
      )}
      onKeyDown={(event) => {
        const current = VIEWS.indexOf(activeTab)
        if (current < 0) return

        const rtl = isRtl(event.currentTarget)
        const goNext =
          event.key === 'ArrowDown' ||
          event.key === (rtl ? 'ArrowLeft' : 'ArrowRight')
        const goPrev =
          event.key === 'ArrowUp' ||
          event.key === (rtl ? 'ArrowRight' : 'ArrowLeft')

        if (goNext) {
          event.preventDefault()
          focusTab(current + 1)
        } else if (goPrev) {
          event.preventDefault()
          focusTab(current - 1)
        } else if (event.key === 'Home') {
          event.preventDefault()
          focusTab(0)
        } else if (event.key === 'End') {
          event.preventDefault()
          focusTab(VIEWS.length - 1)
        }
      }}
    >
      {VIEWS.map((view, index) => {
        const selected = activeTab === view
        return (
          <button
            key={view}
            ref={(node) => {
              tabRefs.current[index] = node
            }}
            type="button"
            role="tab"
            id={DASHBOARD_VIEW_TAB_IDS[view]}
            aria-controls={DASHBOARD_VIEW_PANEL_IDS[view]}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={cn(
              'whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-medium leading-4 transition-colors sm:px-3.5',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              selected
                ? 'bg-white text-[#171717] shadow-[0_1px_2px_#0000000A] dark:bg-background dark:text-foreground'
                : 'text-[#686D67] hover:text-[#171717] dark:text-muted-foreground dark:hover:text-foreground'
            )}
            onClick={() => setActiveTab(view)}
          >
            {viewLabel(view, t)}
          </button>
        )
      })}
    </div>
  )
}
