import "server-only";

import type Stripe from "stripe";

import {
  disambiguateStripeCustomersByBilling,
  selectStripeCustomersForUser,
  STRIPE_USER_ID_METADATA_KEY,
} from "@/lib/stripe-customer-identity";
import { stripe } from "@/server/stripe";

type ResolveStripeCustomerOptions = {
  userId: string;
  email: string;
  previousEmail?: string;
  createIfMissing?: boolean;
  synchronizeEmail?: boolean;
};

type StripeCustomerMatch =
  | { status: "found"; customers: Stripe.Customer[] }
  | { status: "not_found" }
  | { status: "ambiguous"; customerIds: string[] };

export type StripeCustomerEmailSyncResult =
  | { status: "synchronized"; customer: Stripe.Customer }
  | { status: "not_found" }
  | { status: "ambiguous"; customerIds: string[] };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function escapeStripeSearchValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

async function listCustomerCandidates(userId: string, emails: string[]) {
  const customersById = new Map<string, Stripe.Customer>();

  try {
    const customers = await stripe.customers.search({
      query: `metadata['${STRIPE_USER_ID_METADATA_KEY}']:'${escapeStripeSearchValue(userId)}'`,
      limit: 100,
    });
    for (const customer of customers.data) {
      customersById.set(customer.id, customer);
    }
  } catch (error) {
    // Stripe Search can be temporarily unavailable or eventually consistent.
    // The exact-email lookup below remains a safe fallback because ownership is
    // checked before any customer is selected.
    console.warn("[stripe-customer] Customer metadata search failed", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  for (const email of new Set(emails.map(normalizeEmail))) {
    const customers = await stripe.customers.list({ email, limit: 100 });
    for (const customer of customers.data) {
      customersById.set(customer.id, customer);
    }
  }

  return [...customersById.values()];
}

/**
 * Measure how much billing history a customer carries.
 *
 * Both halves matter: recurring plans leave subscriptions, and lifetime plans
 * check out in `mode: 'payment'` and leave only a charge. Reading one signal
 * would treat the other kind of paying customer as disposable. Charges and
 * invoices are listed rather than counted precisely — all the caller needs to
 * know is whether anything is there at all.
 */
async function readBillingActivity(customerId: string) {
  const [subscriptions, charges, invoices] = await Promise.all([
    stripe.subscriptions.list({ customer: customerId, status: "all", limit: 1 }),
    stripe.charges.list({ customer: customerId, limit: 100 }),
    stripe.invoices.list({ customer: customerId, limit: 100 }),
  ]);

  const paidCharges = charges.data.filter(
    (charge) => charge.status === "succeeded" && charge.paid,
  );
  // A paid invoice normally has a charge, but it can be settled out of band or
  // from credit balance, which leaves no charge behind.
  const paidInvoices = invoices.data.filter(
    (invoice) => invoice.status === "paid" || invoice.amount_paid > 0,
  );

  return {
    subscriptionCount: subscriptions.data.length,
    paymentCount: paidCharges.length + paidInvoices.length,
  };
}

async function findCustomersForUser({
  userId,
  email,
  previousEmail,
}: {
  userId: string;
  email: string;
  previousEmail?: string;
}): Promise<StripeCustomerMatch> {
  const normalizedEmail = normalizeEmail(email);
  const candidateEmails = [normalizedEmail];
  if (previousEmail && normalizeEmail(previousEmail) !== normalizedEmail) {
    candidateEmails.push(previousEmail);
  }

  const candidates = await listCustomerCandidates(userId, candidateEmails);
  const selection = selectStripeCustomersForUser(candidates, userId);

  if (selection.outcome === "owned" || selection.outcome === "unclaimed") {
    return { status: "found", customers: selection.customers };
  }

  if (selection.outcome === "not_found") {
    return { status: "not_found" };
  }

  // Several unclaimed legacy customers share this email. Ask Stripe which of
  // them actually carries billing history before giving up on all of them.
  const activity = await Promise.all(
    selection.customers.map(async (customer) => ({
      customer,
      ...(await readBillingActivity(customer.id)),
    })),
  );
  const disambiguation = disambiguateStripeCustomersByBilling(activity);

  if (disambiguation.outcome === "resolved") {
    return { status: "found", customers: [disambiguation.customer] };
  }

  if (disambiguation.outcome === "unclaimable") {
    // Every candidate is an empty shell, so there is no entitlement to strand
    // and the caller is free to start from a fresh, owned customer.
    return { status: "not_found" };
  }

  return {
    status: "ambiguous",
    customerIds: disambiguation.customers.map((customer) => customer.id),
  };
}

export async function resolveStripeCustomerForUser({
  userId,
  email,
  previousEmail,
  createIfMissing = false,
  synchronizeEmail = false,
}: ResolveStripeCustomerOptions): Promise<Stripe.Customer | null> {
  const normalizedEmail = normalizeEmail(email);
  const match = await findCustomersForUser({ userId, email, previousEmail });

  if (match.status === "ambiguous") {
    // Creating a replacement here would read as "no subscription" while the
    // active one keeps billing against a customer we can no longer reach.
    console.error(
      "[stripe-customer] Several legacy Stripe customers hold billing history for this user",
      { userId, customerIds: match.customerIds },
    );
    return null;
  }

  if (match.status === "not_found") {
    if (!createIfMissing) return null;

    return stripe.customers.create({
      email: normalizedEmail,
      metadata: {
        [STRIPE_USER_ID_METADATA_KEY]: userId,
      },
    });
  }

  const [customer] = match.customers;
  const shouldClaimCustomer =
    customer.metadata[STRIPE_USER_ID_METADATA_KEY] !== userId;
  const shouldUpdateEmail =
    synchronizeEmail &&
    normalizeEmail(customer.email || "") !== normalizedEmail;

  if (shouldClaimCustomer || shouldUpdateEmail) {
    return stripe.customers.update(customer.id, {
      ...(shouldUpdateEmail ? { email: normalizedEmail } : {}),
      metadata: {
        [STRIPE_USER_ID_METADATA_KEY]: userId,
      },
    });
  }

  return customer;
}

export async function synchronizeStripeCustomerEmailForUser({
  userId,
  previousEmail,
  email,
}: {
  userId: string;
  previousEmail: string;
  email: string;
}): Promise<StripeCustomerEmailSyncResult> {
  const normalizedEmail = normalizeEmail(email);
  const match = await findCustomersForUser({
    userId,
    email: normalizedEmail,
    previousEmail,
  });

  if (match.status === "ambiguous") {
    return { status: "ambiguous", customerIds: match.customerIds };
  }

  if (match.status === "not_found") {
    return { status: "not_found" };
  }

  const updatedCustomers = await Promise.all(
    match.customers.map((customer) =>
      stripe.customers.update(customer.id, {
        email: normalizedEmail,
        metadata: {
          [STRIPE_USER_ID_METADATA_KEY]: userId,
        },
      }),
    ),
  );

  return { status: "synchronized", customer: updatedCustomers[0] };
}
