'use client'

import Link from 'next/link'
import { useI18n } from '@/locales/client'
import BillingManagement from './components/billing-management'

export default function BillingPage() {
  const t = useI18n()

  return (
    <div className="min-h-[calc(100dvh-var(--navbar-height,4rem))] bg-[#FAFAFA] dark:bg-background">
      <div className="flex h-12 items-center gap-4 border-b border-[#E5E5E5] px-4 text-sm dark:border-border sm:px-6 lg:px-10">
        <Link
          href="/dashboard/settings"
          className="text-[#686D67] transition-colors hover:text-[#171717] dark:text-muted-foreground dark:hover:text-foreground"
        >
          {t('dashboard.settings')}
        </Link>
        <span className="text-[#A3A3A3]" aria-hidden>·</span>
        <span className="font-semibold text-[#171717] dark:text-foreground">
          {t('dashboard.billingSheet.title')}
        </span>
      </div>
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