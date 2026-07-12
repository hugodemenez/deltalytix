export type SubscriptionWithPrice = {
  id: string
  status: string
  current_period_end: number
  current_period_start: number
  created: number
  cancel_at_period_end: boolean
  cancel_at: number | null
  canceled_at: number | null
  trial_end: number | null
  trial_start: number | null
  plan: {
    id: string
    name: string
    amount: number
    interval: 'month' | 'quarter' | 'year' | 'lifetime'
  }
  promotion?: {
    code: string
    amount_off: number
    percent_off: number | null
    duration: {
      duration_in_months: number | null
      duration: 'forever' | 'once' | 'repeating' | null
    }
  }
  invoices?: Array<{
    id: string
    amount_paid: number
    status: string
    created: number
    invoice_pdf: string | null
    hosted_invoice_url: string | null
  }>
}
