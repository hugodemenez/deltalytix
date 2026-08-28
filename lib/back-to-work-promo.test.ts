import { describe, expect, it } from "vitest";
import { billingLookupKey } from "./billing-plan-catalog";
import {
  activeBackToWorkIntervals,
  applyBackToWorkCoupon,
  backToWorkPeriodDisplay,
  buildBackToWorkPricingDisplay,
  formatBackToWorkOfferUntil,
  isBackToWorkOfferActive,
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

describe("back-to-work pricing display", () => {
  it("lists only intervals with a non-empty env value", () => {
    expect(
      activeBackToWorkIntervals({
        STRIPE_BTW_MONTHLY_PROMO: "test-monthly-promo",
        STRIPE_BTW_QUARTERLY_PROMO: "  ",
      }),
    ).toEqual(["monthly"]);
  });

  it("applies percent and amount coupons to list charges", () => {
    expect(applyBackToWorkCoupon(19.99, { percentOff: 20 })).toBe(15.99);
    expect(applyBackToWorkCoupon(45, { percentOff: 20 })).toBe(36);
    expect(applyBackToWorkCoupon(120, { amountOffMinor: 2400 })).toBe(96);
    expect(applyBackToWorkCoupon(19.99, {})).toBeUndefined();
  });

  it("builds client-safe sale prices for usd/eur catalog amounts", () => {
    const display = buildBackToWorkPricingDisplay(env, {
      monthly: { percentOff: 20 },
      quarterly: { percentOff: 20 },
      yearly: { percentOff: 20 },
    });

    expect(display.monthly).toMatchObject({
      offerActive: true,
      listCharge: 19.99,
      saleCharge: 15.99,
      saleMonthlyEquivalent: 15.99,
    });
    expect(display.quarterly).toMatchObject({
      listCharge: 45,
      saleCharge: 36,
      saleMonthlyEquivalent: 12,
    });
    expect(display.yearly).toMatchObject({
      listCharge: 120,
      saleCharge: 96,
      saleMonthlyEquivalent: 8,
    });
    expect(JSON.stringify(display)).not.toMatch(/test-monthly-promo|promo_/);
    expect(isBackToWorkOfferActive(display)).toBe(true);
    expect(backToWorkPeriodDisplay(display, "lifetime")).toBeUndefined();
  });

  it("marks an interval active from env even when the coupon cannot be resolved", () => {
    const display = buildBackToWorkPricingDisplay(
      { STRIPE_BTW_MONTHLY_PROMO: "test-monthly-promo" },
      {},
    );

    expect(display.monthly).toEqual({
      offerActive: true,
      listCharge: 19.99,
      saleCharge: undefined,
      listMonthlyEquivalent: 19.99,
      saleMonthlyEquivalent: undefined,
      percentOff: undefined,
    });
    expect(display.quarterly).toBeUndefined();
  });

  it("skips lifetime and empty env in the display map", () => {
    expect(buildBackToWorkPricingDisplay({}, { monthly: { percentOff: 20 } })).toEqual(
      {},
    );
    expect(
      backToWorkPeriodDisplay(
        buildBackToWorkPricingDisplay(env, { monthly: { percentOff: 20 } }),
        "lifetime",
      ),
    ).toBeUndefined();
  });

  it("treats offer activity as period presence, not a wall-clock expiry check", () => {
    const pastUntilMs = Date.UTC(2020, 0, 1);
    const display = buildBackToWorkPricingDisplay(
      { STRIPE_BTW_MONTHLY_PROMO: "test-monthly-promo" },
      { monthly: { percentOff: 20 } },
      pastUntilMs,
    );

    expect(isBackToWorkOfferActive(display)).toBe(true);
    expect(isBackToWorkOfferActive({})).toBe(false);
    expect(isBackToWorkOfferActive(undefined)).toBe(false);
    expect(display.validUntilMs).toBe(pastUntilMs);
  });
});

describe("formatBackToWorkOfferUntil", () => {
  // Midday UTC so en-GB / fr-FR calendar days stay stable across host TZ.
  const untilMs = Date.UTC(2026, 8, 30, 12, 0, 0);

  it("formats a known timestamp for en and fr without reading the clock", () => {
    expect(formatBackToWorkOfferUntil(untilMs, "en")).toBe("30 Sept 2026");
    expect(formatBackToWorkOfferUntil(untilMs, "fr")).toBe("30 sept. 2026");
  });

  it("returns null when no expiry is present", () => {
    expect(formatBackToWorkOfferUntil(undefined, "en")).toBeNull();
    expect(formatBackToWorkOfferUntil(0, "fr")).toBeNull();
  });
});
