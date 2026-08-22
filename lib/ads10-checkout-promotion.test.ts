import { describe, expect, it } from "vitest";
import {
  ADS10_PROMOTION_CODE_ID,
  ads10PromotionCodeForCheckout,
} from "./ads10-checkout-promotion";

const monthlyUsdPlus = {
  lookupKey: "plus_monthly_usd",
  price: {
    currency: "usd",
    type: "recurring",
    recurring: { interval: "month", interval_count: 1 },
  },
  hasPriorBillingHistory: false,
};

describe("ADS10 Checkout promotion", () => {
  it("applies to a first-time US monthly USD Plus checkout", () => {
    expect(
      ads10PromotionCodeForCheckout({
        ...monthlyUsdPlus,
        country: "us",
      }),
    ).toBe(ADS10_PROMOTION_CODE_ID);
  });

  it("applies to a first-time monthly USD Plus checkout with a gclid", () => {
    expect(
      ads10PromotionCodeForCheckout({
        ...monthlyUsdPlus,
        country: "CA",
        gclid: "google-click-id",
      }),
    ).toBe(ADS10_PROMOTION_CODE_ID);
  });

  it("does not apply without US country or a gclid", () => {
    expect(
      ads10PromotionCodeForCheckout({
        ...monthlyUsdPlus,
        country: "CA",
      }),
    ).toBeNull();
  });

  it.each([
    ["plus_quarterly_usd", "usd", "recurring", "month", 3],
    ["plus_yearly_usd", "usd", "recurring", "year", 1],
    ["plus_lifetime_usd", "usd", "one_time", null, null],
    ["plus_monthly_eur", "eur", "recurring", "month", 1],
  ])(
    "does not apply to non-monthly-USD lookup key %s",
    (lookupKey, currency, type, interval, intervalCount) => {
      expect(
        ads10PromotionCodeForCheckout({
          lookupKey,
          price: {
            currency,
            type,
            recurring:
              interval && intervalCount
                ? { interval, interval_count: intervalCount }
                : null,
          },
          country: "US",
          gclid: "google-click-id",
          hasPriorBillingHistory: false,
        }),
      ).toBeNull();
    },
  );

  it("does not apply when the Stripe price contradicts the monthly lookup key", () => {
    expect(
      ads10PromotionCodeForCheckout({
        ...monthlyUsdPlus,
        price: {
          currency: "usd",
          type: "recurring",
          recurring: { interval: "month", interval_count: 3 },
        },
        country: "US",
      }),
    ).toBeNull();
  });

  it("does not apply to any customer with prior billing history", () => {
    expect(
      ads10PromotionCodeForCheckout({
        ...monthlyUsdPlus,
        country: "US",
        gclid: "google-click-id",
        hasPriorBillingHistory: true,
      }),
    ).toBeNull();
  });
});
