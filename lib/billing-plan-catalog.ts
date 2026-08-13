export const BILLING_PERIODS = [
  "monthly",
  "quarterly",
  "yearly",
  "lifetime",
] as const;

export type BillingPeriod = (typeof BILLING_PERIODS)[number];
export type BillingCurrency = "USD" | "EUR";

export const PLUS_PLAN_PRICES: Record<BillingPeriod, number> = {
  monthly: 19.99,
  quarterly: 45,
  yearly: 120,
  lifetime: 300,
};

export type BillingSubscriptionLike = {
  plan: {
    name: string;
    interval: string;
  };
} | null;

const STRIPE_INTERVAL_BY_PERIOD: Record<
  Exclude<BillingPeriod, "lifetime">,
  string
> = {
  monthly: "month",
  quarterly: "quarter",
  yearly: "year",
};

export function billingLookupKey(
  period: BillingPeriod,
  currency: BillingCurrency,
): string {
  return `plus_${period}_${currency.toLowerCase()}`;
}

export function isLifetimeSubscription(
  subscription: BillingSubscriptionLike,
): boolean {
  return subscription?.plan.interval === "lifetime";
}

export function isCurrentBillingPeriod(
  period: BillingPeriod,
  subscription: BillingSubscriptionLike,
): boolean {
  if (!subscription || period === "lifetime") return false;

  return (
    subscription.plan.name.toLowerCase().includes("plus") &&
    STRIPE_INTERVAL_BY_PERIOD[period] === subscription.plan.interval
  );
}

export type BillingPeriodAvailability =
  | "available"
  | "current"
  | "lifetime-owned";

export function billingPeriodAvailability(
  period: BillingPeriod,
  subscription: BillingSubscriptionLike,
): BillingPeriodAvailability {
  if (isLifetimeSubscription(subscription)) return "lifetime-owned";
  if (isCurrentBillingPeriod(period, subscription)) return "current";
  return "available";
}

/**
 * Periods offered in plan pickers. Monthly Plus is not sold; existing
 * monthly subscribers can still be recognized via `isCurrentBillingPeriod`.
 */
export const OFFERED_BILLING_PERIODS: BillingPeriod[] = [
  "quarterly",
  "yearly",
  "lifetime",
];

/**
 * Periods the user can actually move to:
 * - Free/no subscription: offered Plus periods (no monthly)
 * - Recurring Plus: offered periods except the current interval
 * - Lifetime: none (maximum ownership, no downgrade or repeat purchase)
 */
export function availableBillingPeriods(
  subscription: BillingSubscriptionLike,
): BillingPeriod[] {
  return OFFERED_BILLING_PERIODS.filter(
    (period) =>
      billingPeriodAvailability(period, subscription) === "available",
  );
}

export function billingPeriodCharge(
  period: BillingPeriod,
): number {
  return PLUS_PLAN_PRICES[period];
}

export function billingPeriodMonthlyEquivalent(
  period: BillingPeriod,
): number {
  switch (period) {
    case "quarterly":
      return PLUS_PLAN_PRICES.quarterly / 3;
    case "yearly":
      return PLUS_PLAN_PRICES.yearly / 12;
    default:
      return PLUS_PLAN_PRICES[period];
  }
}

export function formatBillingAmount(
  amount: number,
  currency: BillingCurrency,
  locale: string,
): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
