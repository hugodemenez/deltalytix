import 'server-only'

import { isLocalDashboardAuthBypassEnabled } from '@/lib/local-dashboard-auth'

export type StripeCleanupResult = {
  ok: boolean
  error?: string
  customerIds: string[]
  skipped?: boolean
}

/** True when a real Stripe secret is present (not local bypass placeholder). */
export function isStripeSecretConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

/**
 * Resolve Stripe customer ids for the given emails before any DB wipe.
 * Fail closed when Stripe is configured and the API errors.
 * When Stripe is not configured, skip (ok with empty ids).
 */
export async function listStripeCustomerIdsForEmails(
  emails: string[],
): Promise<StripeCleanupResult> {
  if (isLocalDashboardAuthBypassEnabled()) {
    return { ok: true, customerIds: [], skipped: true }
  }
  if (!isStripeSecretConfigured()) {
    return { ok: true, customerIds: [], skipped: true }
  }
  if (emails.length === 0) return { ok: true, customerIds: [] }

  const { stripe } = await import('@/server/stripe')
  const customerIds: string[] = []
  try {
    for (const email of emails) {
      // Auto-paginate: do not stop at the first page (limit is page size only).
      for await (const customer of stripe.customers.list({
        email,
        limit: 100,
      })) {
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
    return {
      ok: false,
      error: message,
      customerIds: Array.from(new Set(customerIds)),
    }
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
  if (!isStripeSecretConfigured()) {
    return { ok: true, customerIds, skipped: true }
  }
  if (customerIds.length === 0) return { ok: true, customerIds: [] }

  const { stripe } = await import('@/server/stripe')
  try {
    for (const customerId of customerIds) {
      for await (const subscription of stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 100,
      })) {
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
