import 'server-only'

import { isLocalDashboardAuthBypassEnabled } from '@/lib/local-dashboard-auth'
import { stripe } from '@/server/stripe'

export type StripeCleanupResult = {
  ok: boolean
  error?: string
}

/** Attempt to cancel subscriptions and delete Stripe customers for an email. */
export async function cancelStripeForEmail(
  email: string,
): Promise<StripeCleanupResult> {
  if (isLocalDashboardAuthBypassEnabled()) return { ok: true }

  try {
    const customers = await stripe.customers.list({ email, limit: 10 })
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 100,
      })
      for (const subscription of subscriptions.data) {
        if (subscription.status !== 'canceled') {
          await stripe.subscriptions.cancel(subscription.id)
        }
      }
      await stripe.customers.del(customer.id)
    }
    return { ok: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Stripe cleanup failed'
    console.error('[delete-account] Stripe cleanup failed:', message)
    return { ok: false, error: message }
  }
}
