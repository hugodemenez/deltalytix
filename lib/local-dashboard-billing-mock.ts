import type { SubscriptionWithPrice } from '@/lib/subscription-types'

function unixSeconds(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month - 1, day) / 1000)
}

/** Demo subscription + invoices for local dashboard auth bypass and changelog captures. */
export function getLocalDashboardBillingMock(): SubscriptionWithPrice {
  const periodStart = unixSeconds(2026, 7, 1)
  const periodEnd = unixSeconds(2026, 8, 1)
  const created = unixSeconds(2026, 5, 1)

  return {
    id: 'local_demo_subscription',
    status: 'active',
    current_period_start: periodStart,
    current_period_end: periodEnd,
    created,
    cancel_at_period_end: false,
    cancel_at: null,
    canceled_at: null,
    trial_end: null,
    trial_start: null,
    plan: {
      id: 'local_demo_plus_monthly',
      name: 'Plus',
      amount: 2900,
      interval: 'month',
    },
    invoices: [
      {
        id: 'local_demo_invoice_jul_2026',
        amount_paid: 2900,
        status: 'paid',
        created: unixSeconds(2026, 7, 1),
        invoice_pdf: '#',
        hosted_invoice_url: '#',
      },
      {
        id: 'local_demo_invoice_jun_2026',
        amount_paid: 2900,
        status: 'paid',
        created: unixSeconds(2026, 6, 1),
        invoice_pdf: '#',
        hosted_invoice_url: '#',
      },
      {
        id: 'local_demo_invoice_may_2026',
        amount_paid: 2900,
        status: 'paid',
        created: unixSeconds(2026, 5, 1),
        invoice_pdf: '#',
        hosted_invoice_url: '#',
      },
    ],
  }
}
