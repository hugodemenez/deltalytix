import { describe, expect, it } from "vitest";
import { billingLookupKey } from "./billing-plan-catalog";
import {
  resolveBackToWorkPromoCode,
  stripeCheckoutPromoParams,
  type BackToWorkPromoEnv,
} from "./back-to-work-promo";

const env: BackToWorkPromoEnv = {
  STRIPE_BTW_MONTHLY_PROMO: "test-monthly-promo",
  STRIPE_BTW_QUARTERLY_PROMO: "test-quarterly-promo",
  STRIPE_BTW_YEARLY_PROMO: "test-yearly-promo",
};

describe("resolveBackToWorkPromoCode", () => {
  it("maps monthly, quarterly, and yearly Plus lookup keys", () => {
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "plus_monthly_usd", currency: "usd" },
        env,
      ),
    ).toBe("test-monthly-promo");
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "plus_quarterly_usd", currency: "usd" },
        env,
      ),
    ).toBe("test-quarterly-promo");
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "plus_yearly_usd", currency: "usd" },
        env,
      ),
    ).toBe("test-yearly-promo");
  });

  it("applies for both usd and eur Plus prices", () => {
    for (const currency of ["usd", "eur"] as const) {
      expect(
        resolveBackToWorkPromoCode(
          { lookupKey: `plus_monthly_${currency}`, currency },
          env,
        ),
      ).toBe("test-monthly-promo");
    }
  });

  it("uses catalog lookup keys for every sold Plus recurring period and currency", () => {
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: billingLookupKey("monthly", "USD"), currency: "usd" },
        env,
      ),
    ).toBe("test-monthly-promo");
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: billingLookupKey("quarterly", "EUR"), currency: "eur" },
        env,
      ),
    ).toBe("test-quarterly-promo");
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: billingLookupKey("yearly", "USD"), currency: "usd" },
        env,
      ),
    ).toBe("test-yearly-promo");
  });

  it("treats Stripe month+interval_count 3 as quarterly", () => {
    expect(
      resolveBackToWorkPromoCode(
        {
          lookupKey: "plus_quarterly_eur",
          interval: "month",
          intervalCount: 3,
          currency: "eur",
        },
        env,
      ),
    ).toBe("test-quarterly-promo");
  });

  it("uses Stripe recurring interval when the lookup key is only Plus-shaped", () => {
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "plus_custom_usd", interval: "year", currency: "usd" },
        env,
      ),
    ).toBe("test-yearly-promo");
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "plus_custom_usd", interval: "month", currency: "usd" },
        env,
      ),
    ).toBe("test-monthly-promo");
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "plus_custom_usd", interval: "quarter", currency: "usd" },
        env,
      ),
    ).toBe("test-quarterly-promo");
  });

  it("skips non-usd/eur currencies even when the lookup key says usd", () => {
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "plus_monthly_usd", currency: "gbp" },
        env,
      ),
    ).toBeUndefined();
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "plus_monthly_cad", currency: "cad" },
        env,
      ),
    ).toBeUndefined();
  });

  it("skips lifetime, one_time, and lifetime lookup keys", () => {
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "plus_lifetime_usd", currency: "usd" },
        env,
      ),
    ).toBeUndefined();
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: billingLookupKey("lifetime", "EUR"), currency: "eur" },
        env,
      ),
    ).toBeUndefined();
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "plus_monthly_usd", currency: "usd", isLifetime: true },
        env,
      ),
    ).toBeUndefined();
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "plus_monthly_usd", currency: "usd", priceType: "one_time" },
        env,
      ),
    ).toBeUndefined();
  });

  it("skips when the matching env var is missing or empty", () => {
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "plus_monthly_usd", currency: "usd" },
        {},
      ),
    ).toBeUndefined();
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "plus_monthly_usd", currency: "usd" },
        { STRIPE_BTW_MONTHLY_PROMO: "" },
      ),
    ).toBeUndefined();
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "plus_quarterly_usd", currency: "usd" },
        { STRIPE_BTW_MONTHLY_PROMO: "test-monthly-promo" },
      ),
    ).toBeUndefined();
  });

  it("skips whitespace-only env values and trims usable ones", () => {
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "plus_monthly_usd", currency: "usd" },
        { STRIPE_BTW_MONTHLY_PROMO: "   " },
      ),
    ).toBeUndefined();
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "plus_yearly_eur", currency: "eur" },
        { STRIPE_BTW_YEARLY_PROMO: "  test-yearly-promo  " },
      ),
    ).toBe("test-yearly-promo");
  });

  it("skips non-Plus plans", () => {
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "team_monthly_usd", currency: "usd" },
        env,
      ),
    ).toBeUndefined();
    expect(
      resolveBackToWorkPromoCode(
        { lookupKey: "pro_yearly_eur", currency: "eur", interval: "year" },
        env,
      ),
    ).toBeUndefined();
    expect(
      resolveBackToWorkPromoCode({ lookupKey: "", currency: "usd" }, env),
    ).toBeUndefined();
    expect(
      resolveBackToWorkPromoCode(
        { interval: "month", currency: "usd" },
        env,
      ),
    ).toBeUndefined();
  });

  it("skips unsupported Stripe intervals even if the lookup key is monthly", () => {
    expect(
      resolveBackToWorkPromoCode(
        {
          lookupKey: "plus_monthly_usd",
          interval: "week",
          currency: "usd",
        },
        env,
      ),
    ).toBeUndefined();
  });
});

describe("stripeCheckoutPromoParams", () => {
  it("sets discounts and omits allow_promotion_codes when a code is present", () => {
    const params = stripeCheckoutPromoParams("test-monthly-promo");
    expect(params).toEqual({
      discounts: [{ promotion_code: "test-monthly-promo" }],
    });
    expect(params).not.toHaveProperty("allow_promotion_codes");
  });

  it("keeps typed codes enabled when no auto discount applies", () => {
    const params = stripeCheckoutPromoParams(undefined);
    expect(params).toEqual({ allow_promotion_codes: true });
    expect(params).not.toHaveProperty("discounts");
  });
});
