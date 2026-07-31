import { describe, expect, it } from "vitest";

import {
  disambiguateStripeCustomersByBilling,
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
    ).toEqual({ outcome: "owned", customers: [customer("matching", "user-1")] });
  });

  it("allows one legacy customer to be claimed", () => {
    expect(selectStripeCustomersForUser([customer("legacy")], "user-1")).toEqual({
      outcome: "unclaimed",
      customers: [customer("legacy")],
    });
  });

  it("reports ambiguity rather than emptiness when legacy customers share an email", () => {
    expect(
      selectStripeCustomersForUser(
        [customer("legacy-1"), customer("legacy-2")],
        "user-1",
      ),
    ).toEqual({
      outcome: "ambiguous",
      customers: [customer("legacy-1"), customer("legacy-2")],
    });
  });

  it("never claims a customer owned by another user", () => {
    expect(
      selectStripeCustomersForUser([customer("other", "user-2")], "user-1"),
    ).toEqual({ outcome: "not_found", customers: [] });
  });

  it("reports not_found when there is no candidate at all", () => {
    expect(selectStripeCustomersForUser([], "user-1")).toEqual({
      outcome: "not_found",
      customers: [],
    });
  });
});

describe("disambiguateStripeCustomersByBilling", () => {
  it("picks the single candidate that carries a subscription", () => {
    expect(
      disambiguateStripeCustomersByBilling([
        { customer: customer("empty"), subscriptionCount: 0, paymentCount: 0 },
        { customer: customer("billing"), subscriptionCount: 1, paymentCount: 0 },
      ]),
    ).toEqual({ outcome: "resolved", customer: customer("billing") });
  });

  it("picks the lifetime customer, whose purchase leaves no subscription", () => {
    expect(
      disambiguateStripeCustomersByBilling([
        { customer: customer("empty"), subscriptionCount: 0, paymentCount: 0 },
        { customer: customer("lifetime"), subscriptionCount: 0, paymentCount: 1 },
      ]),
    ).toEqual({ outcome: "resolved", customer: customer("lifetime") });
  });

  it("reports every candidate as unclaimable when none has billing history", () => {
    expect(
      disambiguateStripeCustomersByBilling([
        { customer: customer("empty-1"), subscriptionCount: 0, paymentCount: 0 },
        { customer: customer("empty-2"), subscriptionCount: 0, paymentCount: 0 },
      ]),
    ).toEqual({ outcome: "unclaimable" });
  });

  it("stays ambiguous when several candidates carry billing history", () => {
    expect(
      disambiguateStripeCustomersByBilling([
        { customer: customer("billing-1"), subscriptionCount: 2, paymentCount: 0 },
        { customer: customer("billing-2"), subscriptionCount: 1, paymentCount: 0 },
      ]),
    ).toEqual({
      outcome: "ambiguous",
      customers: [customer("billing-1"), customer("billing-2")],
    });
  });

  it("does not let a canceled subscription outrank a lifetime purchase", () => {
    expect(
      disambiguateStripeCustomersByBilling([
        { customer: customer("canceled"), subscriptionCount: 1, paymentCount: 0 },
        { customer: customer("lifetime"), subscriptionCount: 0, paymentCount: 1 },
      ]),
    ).toEqual({
      outcome: "ambiguous",
      customers: [customer("canceled"), customer("lifetime")],
    });
  });
});
