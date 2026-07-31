export type StripeCustomerIdentity = {
  id: string;
  metadata: Record<string, string>;
};

export const STRIPE_USER_ID_METADATA_KEY = "user_id";

/**
 * Select customers that can be safely associated with an authenticated user.
 * Explicit user-id metadata always wins. A legacy customer without metadata is
 * accepted only when there is exactly one unclaimed candidate.
 */
export function selectStripeCustomersForUser<T extends StripeCustomerIdentity>(
  customers: T[],
  userId: string,
): T[] {
  const ownedCustomers = customers.filter(
    (customer) => customer.metadata[STRIPE_USER_ID_METADATA_KEY] === userId,
  );

  if (ownedCustomers.length > 0) {
    return ownedCustomers;
  }

  const unclaimedCustomers = customers.filter(
    (customer) => !customer.metadata[STRIPE_USER_ID_METADATA_KEY],
  );

  return unclaimedCustomers.length === 1 ? unclaimedCustomers : [];
}
