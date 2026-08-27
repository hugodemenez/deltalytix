'use client'

import { useCallback, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

export function DashboardViewSelect({ className }: { className?: string }) {
  const t = useI18n()
  const activeTab = useDashboardHomeTabsStore((state) => state.activeTab)
  const setActiveTab = useDashboardHomeTabsStore((state) => state.setActiveTab)

  return (
    <div className={className}>
      <div className="sr-only">
        {VIEWS.map((view) => (
          <span key={view} id={DASHBOARD_VIEW_TAB_IDS[view]}>
            {viewLabel(view, t)}
          </span>
        ))}
      </div>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'group inline-flex h-7 shrink-0 items-center gap-1 rounded-[4px] border border-[#E5E5E5] bg-white px-2 text-[13px] font-medium text-[#171717] transition-colors hover:bg-[#FAFAFA] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-muted/40',
              'data-[state=open]:bg-[#FAFAFA] dark:data-[state=open]:bg-muted/40'
            )}
          >
            <span className="sr-only">{t('dashboard.tabs.ariaLabel')}: </span>
            <span>{viewLabel(activeTab, t)}</span>
            <ChevronDown
              className="h-3.5 w-3.5 text-[#686D67] transition-transform duration-150 group-data-[state=open]:rotate-180 motion-reduce:transition-none dark:text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-[8.5rem] rounded-[4px] border-[#E5E5E5] p-1 dark:border-border"
        >
          <DropdownMenuRadioGroup
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as DashboardHomeTab)}
          >
            {VIEWS.map((view) => (
              <DropdownMenuRadioItem
                key={view}
                value={view}
                className="text-[13px] text-[#171717] dark:text-foreground"
              >
                {viewLabel(view, t)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
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
