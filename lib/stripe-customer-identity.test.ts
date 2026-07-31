import { describe, expect, it } from "vitest";

import {
  selectStripeCustomersForUser,
  type StripeCustomerIdentity,
} from "./stripe-customer-identity";

const customer = (id: string, userId?: string): StripeCustomerIdentity => ({
  id,
  metadata: userId ? { user_id: userId } : {},
});

describe("selectStripeCustomersForUser", () => {
  it("selects only customers explicitly owned by the authenticated user", () => {
    expect(
      selectStripeCustomersForUser(
        [customer("matching", "user-1"), customer("other", "user-2")],
        "user-1",
      ),
    ).toEqual([customer("matching", "user-1")]);
  });

  it("allows one legacy customer to be claimed", () => {
    expect(
      selectStripeCustomersForUser([customer("legacy")], "user-1"),
    ).toEqual([customer("legacy")]);
  });

  it("does not guess when multiple legacy customers share an email", () => {
    expect(
      selectStripeCustomersForUser(
        [customer("legacy-1"), customer("legacy-2")],
        "user-1",
      ),
    ).toEqual([]);
  });

  it("never claims a customer owned by another user", () => {
    expect(
      selectStripeCustomersForUser([customer("other", "user-2")], "user-1"),
    ).toEqual([]);
  });
});
