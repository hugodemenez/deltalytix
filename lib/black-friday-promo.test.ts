import { describe, expect, it } from "vitest";
import { fromZonedTime } from "date-fns-tz";
import { billingLookupKey } from "./billing-plan-catalog";
import {
  BLACK_FRIDAY_LIFETIME_LIST_AMOUNT_MINOR,
  BLACK_FRIDAY_PROMO_TIMEZONE,
  blackFridayPromoEnvKey,
  blackFridayPromoPhase,
  resolveBlackFridayPromoCode,
  resolveCheckoutAutoPromo,
  resolveCheckoutAutoPromoCode,
  type BlackFridayPromoEnv,
  type BlackFridayPromoInput,
} from "./black-friday-promo";

const env: BlackFridayPromoEnv = {
  STRIPE_BF_LIFETIME_PROMO: "bf-life-usd",
  STRIPE_BF_LIFETIME_PROMO_EUR: "bf-life-eur",
  STRIPE_BF_MONTHLY_PROMO: "bf5-usd",
  STRIPE_BF_MONTHLY_PROMO_EUR: "bf5-eur",
  STRIPE_BF_QUARTERLY_PROMO: "bf15-usd",
  STRIPE_BF_QUARTERLY_PROMO_EUR: "bf15-eur",
  STRIPE_BF_YEARLY_PROMO: "bf50-usd",
  STRIPE_BF_YEARLY_PROMO_EUR: "bf50-eur",
};

const btwEnv: BlackFridayPromoEnv = {
  STRIPE_BTW_MONTHLY_PROMO: "work-monthly-usd",
  STRIPE_BTW_QUARTERLY_PROMO: "work-quarterly-usd",
  STRIPE_BTW_YEARLY_PROMO: "work-yearly-usd",
  STRIPE_BTW_MONTHLY_PROMO_EUR: "work-monthly-eur",
  STRIPE_BTW_QUARTERLY_PROMO_EUR: "work-quarterly-eur",
  STRIPE_BTW_YEARLY_PROMO_EUR: "work-yearly-eur",
};

function paris(local: string, extraMs = 0): Date {
  return new Date(
    fromZonedTime(local, BLACK_FRIDAY_PROMO_TIMEZONE).getTime() + extraMs,
  );
}

const lifetimeUsd: BlackFridayPromoInput = {
  lookupKey: "plus_lifetime_usd",
  currency: "usd",
  priceType: "one_time",
  isLifetime: true,
  unitAmount: BLACK_FRIDAY_LIFETIME_LIST_AMOUNT_MINOR,
};

const lifetimeEur: BlackFridayPromoInput = {
  lookupKey: billingLookupKey("lifetime", "EUR"),
  currency: "eur",
  priceType: "one_time",
  isLifetime: true,
  unitAmount: BLACK_FRIDAY_LIFETIME_LIST_AMOUNT_MINOR,
};

const monthlyUsd: BlackFridayPromoInput = {
  lookupKey: "plus_monthly_usd",
  currency: "usd",
  interval: "month",
  intervalCount: 1,
  priceType: "recurring",
  unitAmount: 1999,
};

const monthlyEur: BlackFridayPromoInput = {
  lookupKey: "plus_monthly_eur",
  currency: "eur",
  interval: "month",
  intervalCount: 1,
  priceType: "recurring",
  unitAmount: 1999,
};

const quarterlyUsd: BlackFridayPromoInput = {
  lookupKey: "plus_quarterly_usd",
  currency: "usd",
  interval: "month",
  intervalCount: 3,
  priceType: "recurring",
  unitAmount: 4500,
};

const quarterlyEur: BlackFridayPromoInput = {
  lookupKey: billingLookupKey("quarterly", "EUR"),
  currency: "eur",
  interval: "month",
  intervalCount: 3,
  priceType: "recurring",
  unitAmount: 4500,
};

const yearlyUsd: BlackFridayPromoInput = {
  lookupKey: "plus_yearly_usd",
  currency: "usd",
  interval: "year",
  intervalCount: 1,
  priceType: "recurring",
  unitAmount: 12000,
};

const yearlyEur: BlackFridayPromoInput = {
  lookupKey: "plus_yearly_eur",
  currency: "eur",
  interval: "year",
  priceType: "recurring",
  unitAmount: 12000,
};

const duringLifetime = paris("2026-11-28T12:00:00");
const duringPlans = paris("2026-12-06T15:30:00");
const beforeLifetime = paris("2026-11-26T23:59:59");
const lifetimeStart = paris("2026-11-27T00:00:00");
const lifetimeEnd = paris("2026-11-30T23:59:59");
const plansStart = paris("2026-12-01T00:00:00");
const plansEnd = paris("2026-12-14T23:59:59");
const afterPlans = paris("2026-12-15T00:00:00");

describe("black friday paris windows", () => {
  it("anchors the sale to Europe/Paris (CET, UTC+1) rather than UTC midnight", () => {
    expect(paris("2026-11-27T00:00:00").toISOString()).toBe(
      "2026-11-26T23:00:00.000Z",
    );
    expect(paris("2026-11-30T23:59:59").toISOString()).toBe(
      "2026-11-30T22:59:59.000Z",
    );
    expect(paris("2026-12-01T00:00:00").toISOString()).toBe(
      "2026-11-30T23:00:00.000Z",
    );
    expect(paris("2026-12-14T23:59:59").toISOString()).toBe(
      "2026-12-14T22:59:59.000Z",
    );
    expect(paris("2026-12-15T00:00:00").toISOString()).toBe(
      "2026-12-14T23:00:00.000Z",
    );
  });

  it("keeps the two windows inclusive and adjacent", () => {
    expect(blackFridayPromoPhase(paris("2026-11-27T00:00:00", -1))).toBeUndefined();
    expect(blackFridayPromoPhase(lifetimeStart)).toBe("lifetime");
    expect(blackFridayPromoPhase(paris("2026-11-29T12:00:00"))).toBe("lifetime");
    expect(blackFridayPromoPhase(paris("2026-11-30T12:00:00"))).toBe("lifetime");
    expect(blackFridayPromoPhase(lifetimeEnd)).toBe("lifetime");
    expect(blackFridayPromoPhase(paris("2026-11-30T23:59:59", 999))).toBe(
      "lifetime",
    );
    expect(blackFridayPromoPhase(plansStart)).toBe("plans");
    expect(blackFridayPromoPhase(plansEnd)).toBe("plans");
    expect(blackFridayPromoPhase(paris("2026-12-14T23:59:59", 999))).toBe("plans");
    expect(blackFridayPromoPhase(afterPlans)).toBeUndefined();
    expect(blackFridayPromoPhase(beforeLifetime)).toBeUndefined();
  });
});

describe("resolveBlackFridayPromoCode", () => {
  it("maps each env key to one plan and currency", () => {
    expect(blackFridayPromoEnvKey("lifetime", "usd")).toBe(
      "STRIPE_BF_LIFETIME_PROMO",
    );
    expect(blackFridayPromoEnvKey("lifetime", "eur")).toBe(
      "STRIPE_BF_LIFETIME_PROMO_EUR",
    );
    expect(blackFridayPromoEnvKey("monthly", "usd")).toBe("STRIPE_BF_MONTHLY_PROMO");
    expect(blackFridayPromoEnvKey("monthly", "eur")).toBe(
      "STRIPE_BF_MONTHLY_PROMO_EUR",
    );
    expect(blackFridayPromoEnvKey("quarterly", "eur")).toBe(
      "STRIPE_BF_QUARTERLY_PROMO_EUR",
    );
    expect(blackFridayPromoEnvKey("yearly", "usd")).toBe("STRIPE_BF_YEARLY_PROMO");
    expect(blackFridayPromoEnvKey("yearly", "eur")).toBe(
      "STRIPE_BF_YEARLY_PROMO_EUR",
    );
  });

  it("applies nothing before the lifetime window, including at 2026-11-26 23:59:59 Paris", () => {
    for (const input of [lifetimeUsd, lifetimeEur, monthlyUsd, quarterlyEur, yearlyUsd]) {
      expect(resolveBlackFridayPromoCode(input, env, beforeLifetime)).toBeUndefined();
      expect(
        resolveBlackFridayPromoCode(input, env, paris("2026-11-27T00:00:00", -1)),
      ).toBeUndefined();
    }
  });

  it("auto-applies only current $300 / €300 Lifetime prices at the lifetime window edges", () => {
    for (const now of [lifetimeStart, duringLifetime, paris("2026-11-30T18:00:00"), lifetimeEnd, paris("2026-11-30T23:59:59", 999)]) {
      expect(resolveBlackFridayPromoCode(lifetimeUsd, env, now)).toBe("bf-life-usd");
      expect(resolveBlackFridayPromoCode(lifetimeEur, env, now)).toBe("bf-life-eur");
      expect(resolveBlackFridayPromoCode(monthlyUsd, env, now)).toBeUndefined();
      expect(resolveBlackFridayPromoCode(monthlyEur, env, now)).toBeUndefined();
      expect(resolveBlackFridayPromoCode(quarterlyUsd, env, now)).toBeUndefined();
      expect(resolveBlackFridayPromoCode(quarterlyEur, env, now)).toBeUndefined();
      expect(resolveBlackFridayPromoCode(yearlyUsd, env, now)).toBeUndefined();
      expect(resolveBlackFridayPromoCode(yearlyEur, env, now)).toBeUndefined();
    }
  });

  it("does not attach Lifetime codes to older $200 / €200 prices or other lookup keys", () => {
    expect(
      resolveBlackFridayPromoCode(
        { ...lifetimeUsd, unitAmount: 20_000 },
        env,
        duringLifetime,
      ),
    ).toBeUndefined();
    expect(
      resolveBlackFridayPromoCode(
        { ...lifetimeEur, unitAmount: 20_000 },
        env,
        duringLifetime,
      ),
    ).toBeUndefined();
    expect(
      resolveBlackFridayPromoCode(
        { ...lifetimeUsd, unitAmount: 200 },
        env,
        duringLifetime,
      ),
    ).toBeUndefined();
    expect(
      resolveBlackFridayPromoCode(
        { ...lifetimeUsd, unitAmount: null },
        env,
        duringLifetime,
      ),
    ).toBeUndefined();
    expect(
      resolveBlackFridayPromoCode(
        { ...lifetimeUsd, unitAmount: undefined },
        env,
        duringLifetime,
      ),
    ).toBeUndefined();

    for (const lookupKey of [
      "plus_lifetime_usd_200",
      "plus_lifetime_usd_legacy",
      "plus_lifetime",
      "lifetime_usd",
      "plus_lifetime_gbp",
      "plus_lifetime_usd_300",
    ]) {
      expect(
        resolveBlackFridayPromoCode(
          { ...lifetimeUsd, lookupKey },
          env,
          duringLifetime,
        ),
      ).toBeUndefined();
    }
  });

  it("does not attach a Lifetime code to a recurring price that reuses the lifetime lookup key", () => {
    expect(
      resolveBlackFridayPromoCode(
        {
          ...lifetimeUsd,
          priceType: "recurring",
          interval: "month",
          intervalCount: 1,
        },
        env,
        duringLifetime,
      ),
    ).toBeUndefined();
  });

  it("switches to subscription codes at 2026-12-01 00:00:00 Paris and stops after 2026-12-14 23:59:59", () => {
    for (const now of [plansStart, duringPlans, plansEnd, paris("2026-12-14T23:59:59", 999)]) {
      expect(resolveBlackFridayPromoCode(monthlyUsd, env, now)).toBe("bf5-usd");
      expect(resolveBlackFridayPromoCode(monthlyEur, env, now)).toBe("bf5-eur");
      expect(resolveBlackFridayPromoCode(quarterlyUsd, env, now)).toBe("bf15-usd");
      expect(resolveBlackFridayPromoCode(quarterlyEur, env, now)).toBe("bf15-eur");
      expect(resolveBlackFridayPromoCode(yearlyUsd, env, now)).toBe("bf50-usd");
      expect(resolveBlackFridayPromoCode(yearlyEur, env, now)).toBe("bf50-eur");
      expect(resolveBlackFridayPromoCode(lifetimeUsd, env, now)).toBeUndefined();
      expect(resolveBlackFridayPromoCode(lifetimeEur, env, now)).toBeUndefined();
    }

    expect(resolveBlackFridayPromoCode(monthlyUsd, env, afterPlans)).toBeUndefined();
    expect(resolveBlackFridayPromoCode(yearlyEur, env, afterPlans)).toBeUndefined();
    expect(resolveBlackFridayPromoCode(lifetimeUsd, env, afterPlans)).toBeUndefined();
    expect(
      resolveBlackFridayPromoCode(monthlyUsd, env, paris("2026-12-15T00:00:00", 1)),
    ).toBeUndefined();
  });

  it("does not give a subscription the code for a different interval", () => {
    expect(resolveBlackFridayPromoCode(monthlyUsd, env, duringPlans)).not.toBe(
      "bf15-usd",
    );
    expect(resolveBlackFridayPromoCode(monthlyEur, env, duringPlans)).not.toBe(
      "bf50-eur",
    );
    expect(resolveBlackFridayPromoCode(quarterlyUsd, env, duringPlans)).not.toBe(
      "bf5-usd",
    );
    expect(resolveBlackFridayPromoCode(yearlyEur, env, duringPlans)).not.toBe(
      "bf15-eur",
    );
    expect(
      resolveBlackFridayPromoCode(
        { ...monthlyUsd, interval: "year", intervalCount: 1 },
        env,
        duringPlans,
      ),
    ).toBeUndefined();
    expect(
      resolveBlackFridayPromoCode(
        { ...yearlyUsd, interval: "month", intervalCount: 3 },
        env,
        duringPlans,
      ),
    ).toBeUndefined();
    expect(
      resolveBlackFridayPromoCode(
        { ...quarterlyUsd, interval: "month", intervalCount: 1 },
        env,
        duringPlans,
      ),
    ).toBeUndefined();
  });

  it("treats Stripe month + interval_count 3 as quarterly and still pairs EUR", () => {
    expect(
      resolveBlackFridayPromoCode(
        {
          lookupKey: "plus_quarterly_eur",
          currency: "eur",
          interval: "month",
          intervalCount: 3,
          priceType: "recurring",
        },
        env,
        duringPlans,
      ),
    ).toBe("bf15-eur");
    expect(
      resolveBlackFridayPromoCode(
        {
          lookupKey: "plus_quarterly_usd",
          currency: "usd",
          interval: "quarter",
          priceType: "recurring",
        },
        env,
        duringPlans,
      ),
    ).toBe("bf15-usd");
  });

  it("does not fall back to a USD promo id when the EUR env var is unset", () => {
    const usdOnly: BlackFridayPromoEnv = {
      STRIPE_BF_LIFETIME_PROMO: "bf-life-usd",
      STRIPE_BF_MONTHLY_PROMO: "bf5-usd",
      STRIPE_BF_QUARTERLY_PROMO: "bf15-usd",
      STRIPE_BF_YEARLY_PROMO: "bf50-usd",
    };
    expect(
      resolveBlackFridayPromoCode(monthlyEur, usdOnly, duringPlans),
    ).toBeUndefined();
    expect(
      resolveBlackFridayPromoCode(quarterlyEur, usdOnly, duringPlans),
    ).toBeUndefined();
    expect(
      resolveBlackFridayPromoCode(yearlyEur, usdOnly, duringPlans),
    ).toBeUndefined();
    expect(
      resolveBlackFridayPromoCode(lifetimeEur, usdOnly, duringLifetime),
    ).toBeUndefined();
    expect(resolveBlackFridayPromoCode(monthlyUsd, usdOnly, duringPlans)).toBe(
      "bf5-usd",
    );
  });

  it("does not apply a USD code when the price currency is EUR, or the reverse", () => {
    expect(
      resolveBlackFridayPromoCode(
        { ...monthlyUsd, currency: "eur" },
        env,
        duringPlans,
      ),
    ).toBeUndefined();
    expect(
      resolveBlackFridayPromoCode(
        { ...lifetimeEur, currency: "usd" },
        env,
        duringLifetime,
      ),
    ).toBeUndefined();
    expect(
      resolveBlackFridayPromoCode(
        { ...yearlyEur, currency: "gbp" },
        env,
        duringPlans,
      ),
    ).toBeUndefined();
  });

  it("infers currency from the lookup key when price.currency is omitted", () => {
    expect(
      resolveBlackFridayPromoCode(
        { lookupKey: "plus_monthly_eur", interval: "month", priceType: "recurring" },
        env,
        duringPlans,
      ),
    ).toBe("bf5-eur");
    expect(
      resolveBlackFridayPromoCode(
        {
          lookupKey: "plus_lifetime_usd",
          priceType: "one_time",
          unitAmount: BLACK_FRIDAY_LIFETIME_LIST_AMOUNT_MINOR,
        },
        env,
        duringLifetime,
      ),
    ).toBe("bf-life-usd");
  });

  it("never applies subscription codes to Lifetime, even if isLifetime is omitted", () => {
    expect(
      resolveBlackFridayPromoCode(
        {
          lookupKey: "plus_lifetime_usd",
          currency: "usd",
          priceType: "one_time",
          unitAmount: BLACK_FRIDAY_LIFETIME_LIST_AMOUNT_MINOR,
        },
        env,
        duringPlans,
      ),
    ).toBeUndefined();
    expect(
      resolveBlackFridayPromoCode(
        { ...monthlyUsd, isLifetime: true },
        env,
        duringPlans,
      ),
    ).toBeUndefined();
    expect(
      resolveBlackFridayPromoCode(
        { ...yearlyEur, priceType: "one_time" },
        env,
        duringPlans,
      ),
    ).toBeUndefined();
  });

  it("skips empty env vars and trims surrounding whitespace", () => {
    expect(resolveBlackFridayPromoCode(monthlyUsd, {}, duringPlans)).toBeUndefined();
    expect(
      resolveBlackFridayPromoCode(
        monthlyUsd,
        { STRIPE_BF_MONTHLY_PROMO: "   " },
        duringPlans,
      ),
    ).toBeUndefined();
    expect(
      resolveBlackFridayPromoCode(
        yearlyEur,
        { STRIPE_BF_YEARLY_PROMO_EUR: "  bf50-eur  " },
        duringPlans,
      ),
    ).toBe("bf50-eur");
  });

  it("does not auto-apply to non-catalog Plus prices", () => {
    expect(
      resolveBlackFridayPromoCode(
        {
          lookupKey: "plus_custom_usd",
          currency: "usd",
          interval: "year",
          priceType: "recurring",
        },
        env,
        duringPlans,
      ),
    ).toBeUndefined();
    expect(
      resolveBlackFridayPromoCode(
        { lookupKey: "team_monthly_usd", currency: "usd", interval: "month" },
        env,
        duringPlans,
      ),
    ).toBeUndefined();
  });
});

describe("resolveCheckoutAutoPromoCode", () => {
  const both = { ...env, ...btwEnv };

  it("uses Black Friday during either phase and never Back-to-Work", () => {
    expect(resolveCheckoutAutoPromoCode(monthlyUsd, both, duringPlans)).toBe(
      "bf5-usd",
    );
    expect(resolveCheckoutAutoPromoCode(quarterlyEur, both, duringPlans)).toBe(
      "bf15-eur",
    );
    expect(resolveCheckoutAutoPromoCode(lifetimeUsd, both, duringLifetime)).toBe(
      "bf-life-usd",
    );
    expect(resolveCheckoutAutoPromoCode(lifetimeUsd, both, lifetimeEnd)).toBe(
      "bf-life-usd",
    );
    expect(
      resolveCheckoutAutoPromoCode(monthlyUsd, both, duringLifetime),
    ).toBeUndefined();
    expect(
      resolveCheckoutAutoPromoCode(monthlyEur, both, lifetimeStart),
    ).toBeUndefined();
    expect(
      resolveCheckoutAutoPromoCode(yearlyUsd, both, paris("2026-11-30T18:00:00")),
    ).toBeUndefined();
    expect(resolveCheckoutAutoPromoCode(lifetimeEur, both, duringPlans)).toBeUndefined();
    expect(resolveCheckoutAutoPromoCode(lifetimeUsd, both, plansStart)).toBeUndefined();
  });

  it("does not substitute Back-to-Work when the matching Black Friday env var is empty", () => {
    expect(resolveCheckoutAutoPromoCode(monthlyUsd, btwEnv, duringPlans)).toBeUndefined();
    expect(
      resolveCheckoutAutoPromoCode(lifetimeUsd, btwEnv, duringLifetime),
    ).toBeUndefined();
    expect(
      resolveCheckoutAutoPromoCode(
        quarterlyEur,
        { ...both, STRIPE_BF_QUARTERLY_PROMO_EUR: "  " },
        duringPlans,
      ),
    ).toBeUndefined();
    expect(
      resolveCheckoutAutoPromoCode(
        monthlyEur,
        { ...btwEnv, STRIPE_BF_MONTHLY_PROMO: "bf5-usd" },
        duringPlans,
      ),
    ).toBeUndefined();
  });

  it("keeps Back-to-Work outside both windows", () => {
    expect(resolveCheckoutAutoPromoCode(monthlyEur, both, afterPlans)).toBe(
      "work-monthly-eur",
    );
    expect(resolveCheckoutAutoPromoCode(yearlyUsd, both, beforeLifetime)).toBe(
      "work-yearly-usd",
    );
    expect(
      resolveCheckoutAutoPromoCode(monthlyUsd, env, afterPlans),
    ).toBeUndefined();
    expect(
      resolveCheckoutAutoPromoCode(lifetimeUsd, both, beforeLifetime),
    ).toBeUndefined();
    expect(
      resolveCheckoutAutoPromoCode(lifetimeUsd, both, afterPlans),
    ).toBeUndefined();
  });

  it("does not hand an inconsistent price a Back-to-Work code during the sale", () => {
    expect(
      resolveCheckoutAutoPromoCode(
        {
          lookupKey: "plus_yearly_usd",
          currency: "usd",
          interval: "year",
          intervalCount: 3,
          priceType: "recurring",
        },
        both,
        duringPlans,
      ),
    ).toBeUndefined();
  });

  it("records bf_lifetime, bf_plans, or btw", () => {
    expect(resolveCheckoutAutoPromo(lifetimeUsd, both, duringLifetime)).toEqual({
      promotionCode: "bf-life-usd",
      campaign: "bf_lifetime",
    });
    expect(
      resolveCheckoutAutoPromo(lifetimeEur, both, paris("2026-11-30T23:59:59", 999)),
    ).toEqual({
      promotionCode: "bf-life-eur",
      campaign: "bf_lifetime",
    });
    expect(resolveCheckoutAutoPromo(monthlyEur, both, duringPlans)).toEqual({
      promotionCode: "bf5-eur",
      campaign: "bf_plans",
    });
    expect(resolveCheckoutAutoPromo(yearlyUsd, both, beforeLifetime)).toEqual({
      promotionCode: "work-yearly-usd",
      campaign: "btw",
    });
    expect(resolveCheckoutAutoPromo(monthlyUsd, both, duringLifetime)).toBeUndefined();
  });
});
