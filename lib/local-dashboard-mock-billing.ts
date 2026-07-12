import type { SubscriptionWithPrice } from '@/server/billing'

function monthsAgoTimestamp(months: number): number {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return Math.floor(date.getTime() / 1000)
}

/** Demo subscription + invoices for local dashboard auth bypass (no Stripe calls). */
export function getLocalDashboardMockSubscriptionData(): SubscriptionWithPrice {
  const now = Math.floor(Date.now() / 1000)
  const periodStart = monthsAgoTimestamp(0)
  const periodEnd = Math.floor(
    new Date(new Date().setMonth(new Date().getMonth() + 1)).getTime() / 1000,
  )

  return {
    id: 'sub_local_dashboard_mock',
    status: 'active',
    current_period_end: periodEnd,
    current_period_start: periodStart,
    created: monthsAgoTimestamp(6),
    cancel_at_period_end: false,
    cancel_at: null,
    canceled_at: null,
    trial_end: null,
    trial_start: null,
    plan: {
      id: 'price_local_plus_monthly',
      name: 'Plus',
      amount: 1999,
      interval: 'month',
    },
    invoices: [
      {
        id: 'in_local_1',
        amount_paid: 1999,
        status: 'paid',
        created: monthsAgoTimestamp(0),
        invoice_pdf: 'https://example.com/invoice-1.pdf',
        hosted_invoice_url: 'https://example.com/invoice-1',
      },
      {
        id: 'in_local_2',
        amount_paid: 1999,
        status: 'paid',
        created: monthsAgoTimestamp(1),
        invoice_pdf: 'https://example.com/invoice-2.pdf',
        hosted_invoice_url: 'https://example.com/invoice-2',
      },
      {
        id: 'in_local_3',
        amount_paid: 1999,
        status: 'paid',
        created: monthsAgoTimestamp(2),
        invoice_pdf: 'https://example.com/invoice-3.pdf',
        hosted_invoice_url: 'https://example.com/invoice-3',
      },
    ],
  }
}
