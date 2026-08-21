export type BillingInvoiceInterval = "month" | "quarter" | "year" | "lifetime" | null

export type BillingInvoiceRecord = {
  id: string
  amount_paid: number
  status: string
  created: number
  invoice_pdf: string | null
  hosted_invoice_url: string | null
  currency: string
  interval: BillingInvoiceInterval
}

type InvoicePeriod = {
  start?: number
  end?: number
}

export type StripePaymentLike = {
  id: string
  amount_paid?: number
  amount?: number
  status?: string | null
  created: number
  invoice_pdf?: string | null
  hosted_invoice_url?: string | null
  currency?: string | null
  description?: string | null
  billing_reason?: string | null
  parent?: { subscription_details?: unknown | null } | null
  subscription?: unknown
  lines?: { data?: Array<{ period?: InvoicePeriod | null }> }
}

export function inferInvoiceInterval(
  invoice: StripePaymentLike,
): BillingInvoiceInterval {
  if (
    invoice.id.startsWith("pi_") ||
    invoice.id.startsWith("ch_") ||
    invoice.description === "One-time Payment"
  ) {
    return "lifetime"
  }

  const hasSubscription =
    invoice.subscription != null ||
    invoice.parent?.subscription_details != null ||
    Boolean(invoice.billing_reason?.startsWith("subscription"))

  if (!hasSubscription) {
    return "lifetime"
  }

  const period = invoice.lines?.data?.[0]?.period
  if (period?.start && period.end && period.end > period.start) {
    const days = (period.end - period.start) / 86_400
    if (days >= 300) return "year"
    if (days >= 75) return "quarter"
    if (days >= 20) return "month"
  }

  return null
}

export function mapStripePaymentRecord(
  record: StripePaymentLike,
): BillingInvoiceRecord {
  return {
    id: record.id,
    amount_paid: record.amount_paid ?? record.amount ?? 0,
    status: record.status ?? "paid",
    created: record.created,
    invoice_pdf: record.invoice_pdf ?? null,
    hosted_invoice_url: record.hosted_invoice_url ?? null,
    currency: (record.currency || "usd").toUpperCase(),
    interval: inferInvoiceInterval(record),
  }
}

export function formatStripeCents(
  amountCents: number,
  currency: string,
  locale: string,
): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format(amountCents / 100)
}
