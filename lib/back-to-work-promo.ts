export const BACK_TO_WORK_PROMO_ENV_KEYS = [
  "STRIPE_BTW_MONTHLY_PROMO",
  "STRIPE_BTW_QUARTERLY_PROMO",
  "STRIPE_BTW_YEARLY_PROMO",
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

const ENV_BY_INTERVAL: Record<BackToWorkPromoInterval, BackToWorkPromoEnvKey> = {
  monthly: "STRIPE_BTW_MONTHLY_PROMO",
  quarterly: "STRIPE_BTW_QUARTERLY_PROMO",
  yearly: "STRIPE_BTW_YEARLY_PROMO",
};

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

  return trimmedEnvValue(env, ENV_BY_INTERVAL[interval]);
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
