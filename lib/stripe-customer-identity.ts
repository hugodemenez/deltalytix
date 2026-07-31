export type StripeCustomerIdentity = {
  id: string;
  metadata: Record<string, string>;
};

export const STRIPE_USER_ID_METADATA_KEY = "user_id";

export type StripeCustomerSelection<T> =
  /** At least one customer carries this user's id metadata. */
  | { outcome: "owned"; customers: T[] }
  /** Exactly one legacy customer has no owner and can be claimed safely. */
  | { outcome: "unclaimed"; customers: T[] }
  /** Several legacy customers have no owner, so ownership cannot be guessed. */
  | { outcome: "ambiguous"; customers: T[] }
  /** Nothing claimable: no candidates, or every candidate belongs elsewhere. */
  | { outcome: "not_found"; customers: [] };

/**
 * Select customers that can be safely associated with an authenticated user.
 * Explicit user-id metadata always wins. A legacy customer without metadata is
 * accepted only when there is exactly one unclaimed candidate.
 *
 * "No candidates" and "several ambiguous candidates" are reported separately:
 * creating a replacement customer is correct for the first and destructive for
 * the second, because an existing subscription may hang off one of the
 * candidates.
 */
export function selectStripeCustomersForUser<T extends StripeCustomerIdentity>(
  customers: T[],
  userId: string,
): StripeCustomerSelection<T> {
  const ownedCustomers = customers.filter(
    (customer) => customer.metadata[STRIPE_USER_ID_METADATA_KEY] === userId,
  );

  if (ownedCustomers.length > 0) {
    return { outcome: "owned", customers: ownedCustomers };
  }

  const unclaimedCustomers = customers.filter(
    (customer) => !customer.metadata[STRIPE_USER_ID_METADATA_KEY],
  );

  if (unclaimedCustomers.length === 1) {
    return { outcome: "unclaimed", customers: unclaimedCustomers };
  }

  if (unclaimedCustomers.length > 1) {
    return { outcome: "ambiguous", customers: unclaimedCustomers };
  }

  return { outcome: "not_found", customers: [] };
}

export type StripeCustomerBillingActivity<T> = {
  customer: T;
  /** Subscriptions in any status, including canceled ones. */
  subscriptionCount: number;
  /**
   * Successful one-time payments — succeeded charges and paid invoices.
   * Lifetime plans check out in `mode: 'payment'` and never create a
   * subscription, so counting subscriptions alone reads a paying lifetime
   * customer as an empty shell.
   */
  paymentCount: number;
};

export type StripeCustomerDisambiguation<T> =
  /** Exactly one candidate holds billing history, so it is the real customer. */
  | { outcome: "resolved"; customer: T }
  /** No candidate holds billing history: none of them owns an entitlement. */
  | { outcome: "unclaimable" }
  /** Several candidates hold billing history and need a human to merge them. */
  | { outcome: "ambiguous"; customers: T[] };

/**
 * Break a tie between unclaimed legacy customers using their billing history.
 *
 * Every customer created before user-id metadata existed is unclaimed, so an
 * email shared by duplicates is common in production data. The entitlement
 * almost always lives on exactly one of them; picking that one recovers it
 * instead of silently minting an empty replacement customer.
 *
 * Recurring and one-time activity count equally. Ranking them would claim the
 * wrong customer when one duplicate holds a canceled subscription and the other
 * holds the lifetime purchase, so that case stays ambiguous on purpose.
 */
export function disambiguateStripeCustomersByBilling<
  T extends StripeCustomerIdentity,
>(activity: StripeCustomerBillingActivity<T>[]): StripeCustomerDisambiguation<T> {
  const billingCustomers = activity
    .filter(
      (candidate) =>
        candidate.subscriptionCount > 0 || candidate.paymentCount > 0,
    )
    .map((candidate) => candidate.customer);

  if (billingCustomers.length === 1) {
    return { outcome: "resolved", customer: billingCustomers[0] };
  }

  if (billingCustomers.length === 0) {
    return { outcome: "unclaimable" };
  }

  return { outcome: "ambiguous", customers: billingCustomers };
}
