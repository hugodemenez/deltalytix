import 'server-only'

import { isLocalDashboardAuthBypassEnabled } from '@/lib/local-dashboard-auth'
import { stripe } from '@/server/stripe'

export type StripeCleanupResult = {
  ok: boolean
  error?: string
  customerIds: string[]
}

/** Attempt to cancel subscriptions and delete Stripe customers for an email. */
export async function cancelStripeForEmail(
  email: string,
): Promise<StripeCleanupResult> {
  if (isLocalDashboardAuthBypassEnabled()) return { ok: true, customerIds: [] }

  const customerIds: string[] = []
  try {
    const customers = await stripe.customers.list({ email, limit: 10 })
    for (const customer of customers.data) {
      customerIds.push(customer.id)
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
    return { ok: true, customerIds }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Stripe cleanup failed'
    console.error('[delete-account] Stripe cleanup failed:', message)
    return { ok: false, error: message, customerIds }
  }
}

/** Retry Stripe customer deletion by known customer ids (no email). */
export async function cancelStripeCustomersByIds(
  customerIds: string[],
): Promise<StripeCleanupResult> {
  if (isLocalDashboardAuthBypassEnabled()) {
    return { ok: true, customerIds }
  }
  if (customerIds.length === 0) return { ok: true, customerIds: [] }

  try {
    for (const customerId of customerIds) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 100,
      })
      for (const subscription of subscriptions.data) {
        if (subscription.status !== 'canceled') {
          await stripe.subscriptions.cancel(subscription.id)
        }
      }
      try {
        await stripe.customers.del(customerId)
      } catch (error) {
        // Already deleted is fine for retries.
        const message = error instanceof Error ? error.message : String(error)
        if (!/no such customer/i.test(message)) throw error
      }
    }
    return { ok: true, customerIds }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Stripe cleanup failed'
    console.error('[delete-account] Stripe retry failed:', message)
    return { ok: false, error: message, customerIds }
  }
}
