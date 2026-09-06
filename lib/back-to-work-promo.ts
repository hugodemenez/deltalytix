import {
  PLUS_PLAN_PRICES,
  billingPeriodMonthlyEquivalent,
  type BillingPeriod,
} from "./billing-plan-catalog";

export const BACK_TO_WORK_PROMO_CURRENCIES = ["usd", "eur"] as const;

export type BackToWorkPromoCurrency =
  (typeof BACK_TO_WORK_PROMO_CURRENCIES)[number];

/** Unsuffixed keys are USD. EUR uses `*_EUR`. */
export const BACK_TO_WORK_PROMO_ENV_KEYS = [
  "STRIPE_BTW_MONTHLY_PROMO",
  "STRIPE_BTW_QUARTERLY_PROMO",
  "STRIPE_BTW_YEARLY_PROMO",
  "STRIPE_BTW_MONTHLY_PROMO_EUR",
  "STRIPE_BTW_QUARTERLY_PROMO_EUR",
  "STRIPE_BTW_YEARLY_PROMO_EUR",
] as const;

export type BackToWorkPromoEnvKey = (typeof BACK_TO_WORK_PROMO_ENV_KEYS)[number];

export type BackToWorkPromoEnv = {
  [key: string]: string | undefined;
};

export type BackToWorkPromoInterval = "monthly" | "quarterly" | "yearly";

export type BackToWorkPromoInput = {
  lookupKey?: string | null;
  interval?: string | null;
  intervalCount?: number | null;
  currency?: string | null;
  isLifetime?: boolean;
  priceType?: string | null;
};

const ENV_BY_INTERVAL_AND_CURRENCY: Record<
  BackToWorkPromoCurrency,
  Record<BackToWorkPromoInterval, BackToWorkPromoEnvKey>
> = {
  usd: {
    monthly: "STRIPE_BTW_MONTHLY_PROMO",
    quarterly: "STRIPE_BTW_QUARTERLY_PROMO",
    yearly: "STRIPE_BTW_YEARLY_PROMO",
  },
  eur: {
    monthly: "STRIPE_BTW_MONTHLY_PROMO_EUR",
    quarterly: "STRIPE_BTW_QUARTERLY_PROMO_EUR",
    yearly: "STRIPE_BTW_YEARLY_PROMO_EUR",
  },
};

export function backToWorkPromoEnvKey(
  interval: BackToWorkPromoInterval,
  currency: BackToWorkPromoCurrency,
): BackToWorkPromoEnvKey {
  return ENV_BY_INTERVAL_AND_CURRENCY[currency][interval];
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isPlusLookupKey(lookupKey: string | null | undefined): boolean {
  return normalize(lookupKey).startsWith("plus_");
}

function periodFromLookupKey(
  lookupKey: string | null | undefined,
): BackToWorkPromoInterval | "lifetime" | undefined {
  const match = normalize(lookupKey).match(
    /^plus_(monthly|quarterly|yearly|lifetime)_/,
  );
  return match?.[1] as BackToWorkPromoInterval | "lifetime" | undefined;
}

function currencyFromLookupKey(
  lookupKey: string | null | undefined,
): string | undefined {
  const match = normalize(lookupKey).match(/^plus_[a-z]+_([a-z0-9]+)$/);
  return match?.[1];
}

function resolveCurrency(input: BackToWorkPromoInput): string | undefined {
  const fromPrice = normalize(input.currency);
  if (fromPrice) return fromPrice;
  return currencyFromLookupKey(input.lookupKey);
}

function resolveInterval(
  input: BackToWorkPromoInput,
): BackToWorkPromoInterval | undefined {
  if (input.intervalCount === 3) return "quarterly";

  const interval = normalize(input.interval);
  if (interval) {
    if (interval === "year") return "yearly";
    if (interval === "quarter") return "quarterly";
    if (interval === "month") return "monthly";
    return undefined;
  }

  const fromKey = periodFromLookupKey(input.lookupKey);
  if (fromKey === "monthly" || fromKey === "quarterly" || fromKey === "yearly") {
    return fromKey;
  }
  return undefined;
}

function trimmedEnvValue(
  env: BackToWorkPromoEnv,
  key: BackToWorkPromoEnvKey,
): string | undefined {
  const raw = env[key];
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed ? trimmed : undefined;
}

/**
 * Returns the Stripe promotion_code id to auto-apply on a new Plus Checkout,
 * or undefined when this purchase is ineligible or the matching env var is unset.
 * USD uses `STRIPE_BTW_*_PROMO`; EUR uses `STRIPE_BTW_*_PROMO_EUR`.
 * Reads the provided env bag only — call with process.env at request time.
 */
export function resolveBackToWorkPromoCode(
  input: BackToWorkPromoInput,
  env: BackToWorkPromoEnv = process.env,
): string | undefined {
  const lookupKey = normalize(input.lookupKey);

  if (
    input.isLifetime ||
    input.priceType === "one_time" ||
    lookupKey.includes("lifetime")
  ) {
    return undefined;
  }

  if (!isPlusLookupKey(input.lookupKey)) {
    return undefined;
  }

  const currency = resolveCurrency(input);
  if (currency !== "usd" && currency !== "eur") {
    return undefined;
  }

  const interval = resolveInterval(input);
  if (!interval) {
    return undefined;
  }

  return trimmedEnvValue(env, backToWorkPromoEnvKey(interval, currency));
}

export type StripeCheckoutPromoParams =
  | { discounts: [{ promotion_code: string }] }
  | { allow_promotion_codes: true };

/**
 * Stripe forbids setting both `discounts` and `allow_promotion_codes` on a
 * Checkout Session. Auto-apply uses discounts; otherwise typed codes stay on.
 */
export function stripeCheckoutPromoParams(
  promotionCode: string | undefined,
): StripeCheckoutPromoParams {
  if (promotionCode) {
    return { discounts: [{ promotion_code: promotionCode }] };
  }
  return { allow_promotion_codes: true };
}

function stripeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "";
}

/**
 * Stripe rejects a Checkout Session when the promotion code coupon currency
 * does not match the line-item price currency. Detect that so callers can
 * retry without auto-applied discounts instead of 500ing.
 */
export function isStripePromoCurrencyMismatch(error: unknown): boolean {
  const message = stripeErrorMessage(error).toLowerCase();
  return (
    message.includes("promotion code") &&
    message.includes("currency") &&
    message.includes("does not match")
  );
}

/**
 * Retry helper for Checkout Session create. On a promo/line-item currency
 * mismatch, strip `discounts` and re-enable typed codes. Other errors rethrow.
 */
export async function createCheckoutSessionWithPromoFallback<TSession>(
  create: (params: Record<string, unknown>) => Promise<TSession>,
  sessionConfig: Record<string, unknown>,
): Promise<TSession> {
  try {
    return await create(sessionConfig);
  } catch (error) {
    if (!sessionConfig.discounts || !isStripePromoCurrencyMismatch(error)) {
      throw error;
    }

    console.warn(
      "[back-to-work-promo] Stripe rejected auto-applied promotion for currency mismatch; retrying checkout without discounts",
      stripeErrorMessage(error),
    );

    const { discounts: _discounts, ...withoutDiscounts } = sessionConfig;
    return create({
      ...withoutDiscounts,
      ...stripeCheckoutPromoParams(undefined),
    });
  }
}

function intervalHasPromo(
  env: BackToWorkPromoEnv,
  interval: BackToWorkPromoInterval,
): boolean {
  return BACK_TO_WORK_PROMO_CURRENCIES.some((currency) =>
    Boolean(trimmedEnvValue(env, backToWorkPromoEnvKey(interval, currency))),
  );
}

/** First configured promo id for an interval (USD, then EUR). Used for coupon display. */
export function firstConfiguredBackToWorkPromoId(
  interval: BackToWorkPromoInterval,
  env: BackToWorkPromoEnv = process.env,
): string | undefined {
  for (const currency of BACK_TO_WORK_PROMO_CURRENCIES) {
    const value = trimmedEnvValue(env, backToWorkPromoEnvKey(interval, currency));
    if (value) return value;
  }
  return undefined;
}

export function activeBackToWorkIntervals(
  env: BackToWorkPromoEnv = process.env,
): BackToWorkPromoInterval[] {
  return (["monthly", "quarterly", "yearly"] as const).filter((interval) =>
    intervalHasPromo(env, interval),
  );
}

export type BackToWorkCouponLike = {
  percentOff?: number | null;
  amountOffMinor?: number | null;
  redeemByMs?: number | null;
};

export type BackToWorkPeriodDisplay = {
  offerActive: boolean;
  listCharge: number;
  saleCharge?: number;
  listMonthlyEquivalent: number;
  saleMonthlyEquivalent?: number;
  percentOff?: number;
};

export type BackToWorkPricingDisplay = {
  monthly?: BackToWorkPeriodDisplay;
  quarterly?: BackToWorkPeriodDisplay;
  yearly?: BackToWorkPeriodDisplay;
  validUntilMs?: number;
};

export function roundBillingMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function applyBackToWorkCoupon(
  listCharge: number,
  coupon: BackToWorkCouponLike | undefined,
): number | undefined {
  if (!coupon) return undefined;

  if (typeof coupon.percentOff === "number" && coupon.percentOff > 0) {
    return roundBillingMoney(listCharge * (1 - coupon.percentOff / 100));
  }

  if (typeof coupon.amountOffMinor === "number" && coupon.amountOffMinor > 0) {
    return roundBillingMoney(Math.max(0, listCharge - coupon.amountOffMinor / 100));
  }

  return undefined;
}

function saleMonthlyEquivalent(
  interval: BackToWorkPromoInterval,
  saleCharge: number,
): number {
  if (interval === "quarterly") return roundBillingMoney(saleCharge / 3);
  if (interval === "yearly") return roundBillingMoney(saleCharge / 12);
  return saleCharge;
}

/**
 * Builds client-safe pricing display. Never include promotion ids in the result.
 */
export function buildBackToWorkPricingDisplay(
  env: BackToWorkPromoEnv,
  coupons: Partial<
    Record<BackToWorkPromoInterval, BackToWorkCouponLike | undefined>
  >,
  validUntilMs?: number,
): BackToWorkPricingDisplay {
  const display: BackToWorkPricingDisplay = {};

  for (const interval of ["monthly", "quarterly", "yearly"] as const) {
    if (!intervalHasPromo(env, interval)) continue;

    const listCharge = PLUS_PLAN_PRICES[interval];
    const rawSale = applyBackToWorkCoupon(listCharge, coupons[interval]);
    const saleCharge =
      rawSale !== undefined && rawSale < listCharge ? rawSale : undefined;
    const percentOff = coupons[interval]?.percentOff;

    display[interval] = {
      offerActive: true,
      listCharge,
      saleCharge,
      listMonthlyEquivalent: billingPeriodMonthlyEquivalent(interval),
      saleMonthlyEquivalent:
        saleCharge === undefined
          ? undefined
          : saleMonthlyEquivalent(interval, saleCharge),
      percentOff:
        typeof percentOff === "number" && percentOff > 0 ? percentOff : undefined,
    };
  }

  if (validUntilMs) {
    display.validUntilMs = validUntilMs;
  }

  return display;
}

export function backToWorkPeriodDisplay(
  display: BackToWorkPricingDisplay | null | undefined,
  period: BillingPeriod,
): BackToWorkPeriodDisplay | undefined {
  if (period === "lifetime") return undefined;
  return display?.[period];
}

export function isBackToWorkOfferActive(
  display: BackToWorkPricingDisplay | null | undefined,
): boolean {
  return Boolean(display?.monthly || display?.quarterly || display?.yearly);
}

/**
 * Formats `validUntilMs` for the landing/pricing note. Do not compare against
 * `Date.now()` here — this helper is called from a prerendered server
 * component, and Next.js rejects wall-clock reads during static generation.
 * Offer visibility is `isBackToWorkOfferActive`; this only formats a date
 * when the display already includes one.
 */
export function formatBackToWorkOfferUntil(
  validUntilMs: number | undefined,
  locale: string,
): string | null {
  if (!validUntilMs) return null;

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(validUntilMs));
}
