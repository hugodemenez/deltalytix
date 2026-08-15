'use client'

import BillingManagement from './components/billing-management'

export default function BillingPage() {
  // Header chrome (`← Dashboard | Billing`) comes from Navbar →
  // DashboardSubpageHeader for /dashboard/billing. Do not duplicate it here.
  return (
    <div className="min-h-[calc(100dvh-var(--navbar-height,4rem))] bg-[#FAFAFA] dark:bg-background">
      <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 lg:px-10">
        <BillingManagement />
      </main>
    </div>
  )
}
