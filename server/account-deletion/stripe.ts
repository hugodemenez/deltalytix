import 'server-only'

import { isLocalDashboardAuthBypassEnabled } from '@/lib/local-dashboard-auth'
import { stripe } from '@/server/stripe'

export type StripeCleanupResult = {
  ok: boolean
  error?: string
  customerIds: string[]
}

/**
 * Resolve Stripe customer ids for the given emails before any DB wipe.
 * Fail closed: any list/API error returns ok:false (caller must abort deletion).
 */
export async function listStripeCustomerIdsForEmails(
  emails: string[],
): Promise<StripeCleanupResult> {
  if (isLocalDashboardAuthBypassEnabled()) {
    return { ok: true, customerIds: [] }
  }
  if (emails.length === 0) return { ok: true, customerIds: [] }

  const customerIds: string[] = []
  try {
    for (const email of emails) {
      const customers = await stripe.customers.list({ email, limit: 10 })
      for (const customer of customers.data) {
        customerIds.push(customer.id)
        // Probe subscriptions so we fail closed if billing access is broken
        // before wiping the app user row.
        await stripe.subscriptions.list({
          customer: customer.id,
          status: 'all',
          limit: 1,
        })
      }
    }
    return { ok: true, customerIds: Array.from(new Set(customerIds)) }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Stripe customer lookup failed'
    console.error('[delete-account] Stripe customer lookup failed:', message)
    return { ok: false, error: message, customerIds: Array.from(new Set(customerIds)) }
  }
}

/** Cancel subscriptions and delete Stripe customers by known ids (no email). */
export async function cancelStripeCustomersByIds(
  customerIds: string[],
): Promise<StripeCleanupResult> {
  if (isLocalDashboardAuthBypassEnabled()) {
    return {
      ok: false,
      customerIds,
      error: 'refusing Stripe cancel under LOCAL_DASHBOARD_AUTH_BYPASS',
    }
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
        const message = error instanceof Error ? error.message : String(error)
        if (!/no such customer/i.test(message)) throw error
      }
    }
    return { ok: true, customerIds }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Stripe cleanup failed'
    console.error('[delete-account] Stripe cleanup failed:', message)
    return { ok: false, error: message, customerIds }
  }
}
