import "server-only";

import type Stripe from "stripe";

import {
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

export async function resolveStripeCustomerForUser({
  userId,
  email,
  previousEmail,
  createIfMissing = false,
  synchronizeEmail = false,
}: ResolveStripeCustomerOptions): Promise<Stripe.Customer | null> {
  const normalizedEmail = normalizeEmail(email);
  const candidateEmails = [normalizedEmail];
  if (previousEmail && normalizeEmail(previousEmail) !== normalizedEmail) {
    candidateEmails.push(previousEmail);
  }

  const candidates = await listCustomerCandidates(userId, candidateEmails);
  const validatedCustomers = selectStripeCustomersForUser(candidates, userId);

  if (validatedCustomers.length === 0) {
    if (!createIfMissing) return null;

    return stripe.customers.create({
      email: normalizedEmail,
      metadata: {
        [STRIPE_USER_ID_METADATA_KEY]: userId,
      },
    });
  }

  const [customer] = validatedCustomers;
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
}) {
  const normalizedEmail = normalizeEmail(email);
  const candidates = await listCustomerCandidates(userId, [
    normalizedEmail,
    previousEmail,
  ]);
  const validatedCustomers = selectStripeCustomersForUser(candidates, userId);

  if (validatedCustomers.length === 0) return null;

  const updatedCustomers = await Promise.all(
    validatedCustomers.map((customer) =>
      stripe.customers.update(customer.id, {
        email: normalizedEmail,
        metadata: {
          [STRIPE_USER_ID_METADATA_KEY]: userId,
        },
      }),
    ),
  );

  return updatedCustomers[0];
}
