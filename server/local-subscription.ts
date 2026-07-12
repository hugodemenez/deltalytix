'use server'

import { isLocalDashboardAuthBypassEnabled } from '@/lib/local-dashboard-auth'
import { getLocalDashboardBillingMock } from '@/lib/local-dashboard-billing-mock'
import type { SubscriptionWithPrice } from '@/lib/subscription-types'

/** Loads subscription data without importing Stripe/Prisma when local bypass is active. */
export async function getSubscriptionDataForDashboard(): Promise<SubscriptionWithPrice | null> {
  if (
    isLocalDashboardAuthBypassEnabled() ||
    process.env.CHANGELOG_MEDIA_CAPTURE === '1'
  ) {
    return getLocalDashboardBillingMock()
  }

  const { getSubscriptionData } = await import('@/server/billing')
  return getSubscriptionData()
}
