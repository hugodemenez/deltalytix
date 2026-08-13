'use client'

import { useI18n } from '@/locales/client'
import BillingManagement from './components/billing-management'
import { BillingPlanList } from './components/billing-plan-list'

export default function BillingPage() {
  const t = useI18n()

  return (
    <main className="min-h-[calc(100dvh-var(--navbar-height,4rem))] bg-[#FAFAFA] px-4 py-8 dark:bg-background sm:px-6 lg:px-10 lg:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#171717] dark:text-foreground sm:text-3xl">
            {t('dashboard.billingSheet.title')}
          </h1>
          <p className="mt-1 text-sm text-[#686D67] dark:text-muted-foreground">
            {t('dashboard.billingSheet.description')}
          </p>
        </header>

        <section className="overflow-hidden rounded-[4px] border border-[#E5E5E5] bg-white dark:border-border dark:bg-card">
          <BillingPlanList
            contentClassName="p-4 sm:p-6"
            footerClassName="p-4 sm:p-6"
          />
        </section>

        <div className="mt-8">
          <BillingManagement showPlanSections={false} />
        </div>
      </div>
    </main>
  )
}