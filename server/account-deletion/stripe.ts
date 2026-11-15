import 'server-only'

import { isLocalDashboardAuthBypassEnabled } from '@/lib/local-dashboard-auth'
import { isStripeSecretConfigured } from '@/lib/stripe-secret'

export type StripeCleanupResult = {
  ok: boolean
  error?: string
  customerIds: string[]
  skipped?: boolean
}

export { isStripeSecretConfigured }

/** Case-fold emails for Stripe lookup (Stripe email match is case-sensitive). */
export function stripeEmailLookupVariants(emails: string[]): string[] {
  const variants = new Set<string>()
  for (const raw of emails) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    variants.add(trimmed)
    variants.add(trimmed.toLowerCase())
  }
  return Array.from(variants)
}

/**
 * Resolve Stripe customer ids for the given emails before any DB wipe.
 * Fail closed when Stripe is configured and the API errors.
 * When Stripe is not configured, skip (ok with empty ids) — caller must
 * still block deletion if a live app Subscription exists.
 */
export async function listStripeCustomerIdsForEmails(
  emails: string[],
): Promise<StripeCleanupResult> {
  if (isLocalDashboardAuthBypassEnabled()) {
    return { ok: true, customerIds: [], skipped: true }
  }
  // Same source as server/stripe.ts: process.env.STRIPE_SECRET_KEY.
  if (!isStripeSecretConfigured()) {
    return { ok: true, customerIds: [], skipped: true }
  }
  if (emails.length === 0) return { ok: true, customerIds: [] }

  const { stripe } = await import('@/server/stripe')
  const customerIds: string[] = []
  try {
    for (const email of stripeEmailLookupVariants(emails)) {
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

/** Fetch Stripe customer emails (lowercased) for reuse checks. */
export async function listStripeCustomerEmailsByIds(
  customerIds: string[],
): Promise<{ ok: boolean; emails: string[]; error?: string }> {
  if (!isStripeSecretConfigured()) {
    return {
      ok: false,
      emails: [],
      error: 'Stripe not configured; cannot load customer emails',
    }
  }
  if (customerIds.length === 0) return { ok: true, emails: [] }

  const { stripe } = await import('@/server/stripe')
  const emails: string[] = []
  try {
    for (const customerId of customerIds) {
      const customer = await stripe.customers.retrieve(customerId)
      if ('deleted' in customer && customer.deleted) continue
      const email = customer.email?.trim()
      if (email) emails.push(email.toLowerCase())
    }
    return { ok: true, emails: Array.from(new Set(emails)) }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Stripe customer retrieve failed'
    console.error('[delete-account] Stripe customer retrieve failed:', message)
    return { ok: false, emails: Array.from(new Set(emails)), error: message }
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
  // Same source as server/stripe.ts: process.env.STRIPE_SECRET_KEY.
  if (!isStripeSecretConfigured()) {
    // Never pretend success when real customer ids are still queued.
    if (customerIds.length > 0) {
      return {
        ok: false,
        customerIds,
        error:
          'Stripe not configured; refusing to clear queued Stripe customer ids',
      }
    }
    return { ok: true, customerIds: [], skipped: true }
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
