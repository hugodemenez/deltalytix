import { describe, expect, it } from "vitest";
import {
  availableBillingPeriods,
  billingLookupKey,
  billingPeriodAvailability,
  billingPeriodMonthlyEquivalent,
} from "./billing-plan-catalog";

describe("billing plan catalog", () => {
  it("offers yearly-first Plus periods to a free user, without monthly", () => {
    expect(availableBillingPeriods(null)).toEqual([
      "quarterly",
      "yearly",
      "lifetime",
    ]);
  });

  it("never re-offers monthly Plus", () => {
    expect(availableBillingPeriods(null)).not.toContain("monthly");
    expect(
      availableBillingPeriods({
        plan: { name: "Plus", interval: "year" },
      }),
    ).not.toContain("monthly");
  });

  it("excludes the current recurring interval", () => {
    const subscription = {
      plan: { name: "Plus", interval: "quarter" },
    };

    expect(availableBillingPeriods(subscription)).toEqual([
      "yearly",
      "lifetime",
    ]);
    expect(
      billingPeriodAvailability("quarterly", subscription),
    ).toBe("current");
  });

  it("offers no changes to a lifetime owner", () => {
    const subscription = {
      plan: { name: "Lifetime Plan", interval: "lifetime" },
    };

    expect(availableBillingPeriods(subscription)).toEqual([]);
    expect(
      billingPeriodAvailability("monthly", subscription),
    ).toBe("lifetime-owned");
    expect(
      billingPeriodAvailability("lifetime", subscription),
    ).toBe("lifetime-owned");
  });

  it("uses the same Plus lookup-key shape as checkout", () => {
    expect(billingLookupKey("yearly", "EUR")).toBe("plus_yearly_eur");
    expect(billingLookupKey("lifetime", "USD")).toBe("plus_lifetime_usd");
  });

  it("exposes catalog monthly equivalents", () => {
    expect(billingPeriodMonthlyEquivalent("monthly")).toBe(19.99);
    expect(billingPeriodMonthlyEquivalent("quarterly")).toBe(15);
    expect(billingPeriodMonthlyEquivalent("yearly")).toBe(10);
  });
});
