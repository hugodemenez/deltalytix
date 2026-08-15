'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useDashboardHomeTabsStore,
  type DashboardHomeTab,
} from '@/store/dashboard-home-tabs-store'

const VIEWS: DashboardHomeTab[] = ['widgets', 'table', 'accounts']

export function DashboardViewMenu({ className }: { className?: string }) {
  const t = useI18n()
  const activeTab = useDashboardHomeTabsStore((state) => state.activeTab)
  const setActiveTab = useDashboardHomeTabsStore((state) => state.setActiveTab)

  const label =
    activeTab === 'table'
      ? t('dashboard.tabs.table')
      : activeTab === 'accounts'
        ? t('dashboard.tabs.accounts')
        : t('dashboard.tabs.widgets')

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('dashboard.tabs.ariaLabel')}
          className={cn(
            'inline-flex h-7 shrink-0 items-center gap-1 rounded-[4px] border border-[#E5E5E5] bg-white px-2.5 text-sm font-medium text-[#171717] transition-colors hover:bg-[#FAFAFA] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-muted/40',
            className
          )}
        >
          {label}
          <ChevronDown className="h-3.5 w-3.5 text-[#686D67]" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[10rem] rounded-[4px] border-[#E5E5E5] p-1 dark:border-border"
      >
        {VIEWS.map((view) => (
          <DropdownMenuItem
            key={view}
            className="flex items-center justify-between gap-4"
            onSelect={() => setActiveTab(view)}
          >
            <span>
              {view === 'table'
                ? t('dashboard.tabs.table')
                : view === 'accounts'
                  ? t('dashboard.tabs.accounts')
                  : t('dashboard.tabs.widgets')}
            </span>
            {activeTab === view ? (
              <Check className="h-4 w-4 text-[#171717]" strokeWidth={2} />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
