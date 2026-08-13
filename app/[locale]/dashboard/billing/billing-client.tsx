'use client'

import { useI18n } from '@/locales/client'
import BillingManagement from './components/billing-management'
import { DashboardSubpageHeader } from '../components/dashboard-subpage-header'

export default function BillingPage() {
  const t = useI18n()

  return (
    <div className="min-h-[calc(100dvh-var(--navbar-height,4rem))] bg-[#FAFAFA] dark:bg-background">
      <DashboardSubpageHeader
        title={t('dashboard.billingSheet.title')}
        backHref="/dashboard/settings"
        backLabel={t('dashboard.settings')}
      />
      <main className="px-4 py-8 sm:px-6 lg:px-10">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#171717] dark:text-foreground">
          {t('dashboard.billingSheet.title')}
        </h1>
        <div className="mx-auto mt-6 w-full max-w-xl">
          <BillingManagement />
        </div>
      </main>
    </div>
  )
}