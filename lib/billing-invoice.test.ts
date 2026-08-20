import { describe, expect, it } from "vitest"
import {
  formatStripeCents,
  inferInvoiceInterval,
  mapStripePaymentRecord,
} from "./billing-invoice"

describe("inferInvoiceInterval", () => {
  it("treats payment intents and charges as lifetime", () => {
    expect(
      inferInvoiceInterval({
        id: "pi_123",
        status: "paid",
        created: 1,
        description: "One-time Payment",
      }),
    ).toBe("lifetime")
    expect(
      inferInvoiceInterval({
        id: "ch_123",
        status: "paid",
        created: 1,
      }),
    ).toBe("lifetime")
  })

  it("treats invoices without a subscription as lifetime", () => {
    expect(
      inferInvoiceInterval({
        id: "in_123",
        status: "paid",
        created: 1,
        billing_reason: "manual",
      }),
    ).toBe("lifetime")
  })

  it("reads the billed period from the first line item", () => {
    const start = 1_700_000_000
    expect(
      inferInvoiceInterval({
        id: "in_month",
        status: "paid",
        created: start,
        billing_reason: "subscription_cycle",
        lines: { data: [{ period: { start, end: start + 30 * 86_400 } }] },
      }),
    ).toBe("month")
    expect(
      inferInvoiceInterval({
        id: "in_quarter",
        status: "paid",
        created: start,
        parent: { subscription_details: { subscription: "sub_1" } },
        lines: { data: [{ period: { start, end: start + 90 * 86_400 } }] },
      }),
    ).toBe("quarter")
    expect(
      inferInvoiceInterval({
        id: "in_year",
        status: "paid",
        created: start,
        subscription: "sub_1",
        lines: { data: [{ period: { start, end: start + 365 * 86_400 } }] },
      }),
    ).toBe("year")
  })

  it("returns null when a subscription invoice has no usable period", () => {
    expect(
      inferInvoiceInterval({
        id: "in_unknown",
        status: "paid",
        created: 1,
        billing_reason: "subscription_cycle",
      }),
    ).toBeNull()
  })
})

describe("mapStripePaymentRecord", () => {
  it("keeps the Stripe currency instead of a detected locale currency", () => {
    expect(
      mapStripePaymentRecord({
        id: "in_eur",
        amount_paid: 4500,
        status: "paid",
        created: 1,
        currency: "eur",
        billing_reason: "manual",
        invoice_pdf: "https://example.com/invoice.pdf",
        hosted_invoice_url: "https://example.com/invoice",
      }),
    ).toEqual({
      id: "in_eur",
      amount_paid: 4500,
      status: "paid",
      created: 1,
      invoice_pdf: "https://example.com/invoice.pdf",
      hosted_invoice_url: "https://example.com/invoice",
      currency: "EUR",
      interval: "lifetime",
    })
  })
})

describe("formatStripeCents", () => {
  it("formats the invoice currency, not a geo-detected one", () => {
    expect(formatStripeCents(4500, "eur", "en")).toBe("€45.00")
    expect(formatStripeCents(1999, "usd", "en")).toBe("$19.99")
  })
})
