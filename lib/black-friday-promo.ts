import { fromZonedTime } from "date-fns-tz";
import {
  resolveBackToWorkPromoCode,
  type BackToWorkPromoEnv,
} from "./back-to-work-promo";

/**
 * Black Friday / Cyber Week auto-apply for new Plus Checkout Sessions.
 *
 * Stripe promotion codes have an end time and no start time, so eligibility
 * is date-gated here in Europe/Paris. Outside these windows this module
 * returns undefined and Checkout keeps the existing Back-to-Work behavior.
 *
 * Windows are inclusive of the start instant and of the whole end second
 * (through 23:59:59.999). They abut and do not overlap:
 * - Lifetime: 2026-11-27 00:00:00 through 2026-11-29 23:59:59
 * - Three plans: 2026-11-30 00:00:00 through 2026-12-13 23:59:59
 *
 * Unsuffixed env keys are USD promotion_code ids. EUR uses `*_EUR`.
 * Live ids are set on Vercel (beta and production), not committed as values:
 * - STRIPE_BF_LIFETIME_PROMO=promo_1UZzmpCgu8zCkThC8l3jgcMp (BFLIFE, plus_lifetime_usd)
 * - STRIPE_BF_LIFETIME_PROMO_EUR=promo_1UZzmrCgu8zCkThCqQytAso5 (BFLIFEEUR, plus_lifetime_eur)
 * - STRIPE_BF_MONTHLY_PROMO=promo_1UZzmnCgu8zCkThC9P2Hf3q9 (BF5)
 * - STRIPE_BF_MONTHLY_PROMO_EUR=promo_1UZzmmCgu8zCkThCTsJYK5Nc (BF5EUR)
 * - STRIPE_BF_QUARTERLY_PROMO=promo_1UZzmoCgu8zCkThCy4qNy9Gx (BF15)
 * - STRIPE_BF_QUARTERLY_PROMO_EUR=promo_1UZzmpCgu8zCkThCrZFhFx0w (BF15EUR)
 * - STRIPE_BF_YEARLY_PROMO=promo_1UZzmnCgu8zCkThCXtkr8KBm (BF50)
 * - STRIPE_BF_YEARLY_PROMO_EUR=promo_1UZzmpCgu8zCkThCs6pkaWg2 (BF50EUR)
 */
export const BLACK_FRIDAY_PROMO_TIMEZONE = "Europe/Paris";

/** Current Plus Lifetime list price in minor units ($300 / €300). */
export const BLACK_FRIDAY_LIFETIME_LIST_AMOUNT_MINOR = 30_000;

export const BLACK_FRIDAY_PROMO_ENV_KEYS = [
  "STRIPE_BF_LIFETIME_PROMO",
  "STRIPE_BF_LIFETIME_PROMO_EUR",
  "STRIPE_BF_MONTHLY_PROMO",
  "STRIPE_BF_MONTHLY_PROMO_EUR",
  "STRIPE_BF_QUARTERLY_PROMO",
  "STRIPE_BF_QUARTERLY_PROMO_EUR",
  "STRIPE_BF_YEARLY_PROMO",
  "STRIPE_BF_YEARLY_PROMO_EUR",
] as const;

export type BlackFridayPromoEnvKey = (typeof BLACK_FRIDAY_PROMO_ENV_KEYS)[number];

export type BlackFridayPromoEnv = BackToWorkPromoEnv;

export type BlackFridayPromoCurrency = "usd" | "eur";

export type BlackFridayPromoPeriod =
  | "monthly"
  | "quarterly"
  | "yearly"
  | "lifetime";

export type BlackFridayPromoPhase = "lifetime" | "plans";

export type BlackFridayPromoInput = {
  lookupKey?: string | null;
  interval?: string | null;
  intervalCount?: number | null;
  currency?: string | null;
  isLifetime?: boolean;
  priceType?: string | null;
  /** Stripe Price.unit_amount in minor units. Required for the Lifetime phase. */
  unitAmount?: number | null;
};

const ENV_BY_PERIOD_AND_CURRENCY: Record<
  BlackFridayPromoCurrency,
  Record<BlackFridayPromoPeriod, BlackFridayPromoEnvKey>
> = {
  usd: {
    lifetime: "STRIPE_BF_LIFETIME_PROMO",
    monthly: "STRIPE_BF_MONTHLY_PROMO",
    quarterly: "STRIPE_BF_QUARTERLY_PROMO",
    yearly: "STRIPE_BF_YEARLY_PROMO",
  },
  eur: {
    lifetime: "STRIPE_BF_LIFETIME_PROMO_EUR",
    monthly: "STRIPE_BF_MONTHLY_PROMO_EUR",
    quarterly: "STRIPE_BF_QUARTERLY_PROMO_EUR",
    yearly: "STRIPE_BF_YEARLY_PROMO_EUR",
  },
};

const LIFETIME_WINDOW = {
  start: "2026-11-27T00:00:00",
  end: "2026-11-29T23:59:59",
} as const;

const PLANS_WINDOW = {
  start: "2026-11-30T00:00:00",
  end: "2026-12-13T23:59:59",
} as const;

const SECOND_MS = 1000;

const LOOKUP_KEY =
  /^plus_(monthly|quarterly|yearly|lifetime)_(usd|eur)$/;

type SubscriptionPeriod = Exclude<BlackFridayPromoPeriod, "lifetime">;

function parisMs(local: string): number {
  return fromZonedTime(local, BLACK_FRIDAY_PROMO_TIMEZONE).getTime();
}

function inclusiveWindowMs(startLocal: string, endLocal: string): {
  startMs: number;
  endExclusiveMs: number;
} {
  return {
    startMs: parisMs(startLocal),
    endExclusiveMs: parisMs(endLocal) + SECOND_MS,
  };
}

const LIFETIME_WINDOW_MS = inclusiveWindowMs(
  LIFETIME_WINDOW.start,
  LIFETIME_WINDOW.end,
);
const PLANS_WINDOW_MS = inclusiveWindowMs(PLANS_WINDOW.start, PLANS_WINDOW.end);

export function blackFridayPromoEnvKey(
  period: BlackFridayPromoPeriod,
  currency: BlackFridayPromoCurrency,
): BlackFridayPromoEnvKey {
  return ENV_BY_PERIOD_AND_CURRENCY[currency][period];
}

export function blackFridayPromoPhase(
  now: Date,
): BlackFridayPromoPhase | undefined {
  const nowMs = now.getTime();
  if (
    nowMs >= LIFETIME_WINDOW_MS.startMs &&
    nowMs < LIFETIME_WINDOW_MS.endExclusiveMs
  ) {
    return "lifetime";
  }
  if (nowMs >= PLANS_WINDOW_MS.startMs && nowMs < PLANS_WINDOW_MS.endExclusiveMs) {
    return "plans";
  }
  return undefined;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function trimmedEnvValue(
  env: BlackFridayPromoEnv,
  key: BlackFridayPromoEnvKey,
): string | undefined {
  const raw = env[key];
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed ? trimmed : undefined;
}

function parseLookupKey(
  lookupKey: string | null | undefined,
): { period: BlackFridayPromoPeriod; currency: BlackFridayPromoCurrency } | undefined {
  const match = normalize(lookupKey).match(LOOKUP_KEY);
  if (!match) return undefined;
  return {
    period: match[1] as BlackFridayPromoPeriod,
    currency: match[2] as BlackFridayPromoCurrency,
  };
}

function agreedCurrency(
  priceCurrency: string | null | undefined,
  lookupCurrency: BlackFridayPromoCurrency,
): BlackFridayPromoCurrency | undefined {
  const raw = normalize(priceCurrency);
  if (!raw) return lookupCurrency;
  if (raw === lookupCurrency) return lookupCurrency;
  return undefined;
}

/**
 * Stripe recurring shape for the sold Plus intervals.
 * `month` + interval_count 3 is quarterly. Omitted interval means "unknown
 * here" so the lookup key can stand alone. Anything else is a mismatch.
 */
function stripeSubscriptionPeriod(
  input: BlackFridayPromoInput,
): SubscriptionPeriod | "mismatch" | undefined {
  const interval = normalize(input.interval);
  const count = input.intervalCount;

  if (count === 3) {
    if (!interval || interval === "month" || interval === "quarter") {
      return "quarterly";
    }
    return "mismatch";
  }

  if (!interval) return undefined;
  if ((count == null || count === 1) && interval === "year") return "yearly";
  if ((count == null || count === 1) && interval === "quarter") return "quarterly";
  if ((count == null || count === 1) && interval === "month") return "monthly";
  return "mismatch";
}

function isCurrentLifetimeListPrice(input: BlackFridayPromoInput): boolean {
  return input.unitAmount === BLACK_FRIDAY_LIFETIME_LIST_AMOUNT_MINOR;
}

function lifetimePriceIsOneTime(input: BlackFridayPromoInput): boolean {
  if (normalize(input.priceType) === "recurring") return false;
  const stripePeriod = stripeSubscriptionPeriod(input);
  return stripePeriod === undefined;
}

function subscriptionIntervalMatches(
  input: BlackFridayPromoInput,
  period: SubscriptionPeriod,
): boolean {
  if (input.isLifetime) return false;
  if (normalize(input.priceType) === "one_time") return false;
  if (normalize(input.lookupKey).includes("lifetime")) return false;

  const stripePeriod = stripeSubscriptionPeriod(input);
  if (stripePeriod === "mismatch") return false;
  if (stripePeriod && stripePeriod !== period) return false;
  return true;
}

/**
 * Promotion_code id to auto-apply, or undefined when the Paris window,
 * plan, currency, or env var does not match. Lifetime codes never return
 * for monthly, quarterly, or yearly. Subscription codes never return for
 * Lifetime, including older $200 / €200 Lifetime prices.
 */
export function resolveBlackFridayPromoCode(
  input: BlackFridayPromoInput,
  env: BlackFridayPromoEnv = process.env,
  now: Date = new Date(),
): string | undefined {
  const phase = blackFridayPromoPhase(now);
  if (!phase) return undefined;

  const parsed = parseLookupKey(input.lookupKey);
  if (!parsed) return undefined;

  const currency = agreedCurrency(input.currency, parsed.currency);
  if (!currency) return undefined;

  if (phase === "lifetime") {
    if (parsed.period !== "lifetime") return undefined;
    if (!isCurrentLifetimeListPrice(input)) return undefined;
    if (!lifetimePriceIsOneTime(input)) return undefined;
    return trimmedEnvValue(env, blackFridayPromoEnvKey("lifetime", currency));
  }

  if (parsed.period === "lifetime") return undefined;
  if (!subscriptionIntervalMatches(input, parsed.period)) return undefined;
  return trimmedEnvValue(env, blackFridayPromoEnvKey(parsed.period, currency));
}

/**
 * Checkout auto-apply: Black Friday / Cyber Week when its window matches,
 * otherwise the existing Back-to-Work promotion. One code at most.
 */
export function resolveCheckoutAutoPromoCode(
  input: BlackFridayPromoInput,
  env: BlackFridayPromoEnv = process.env,
  now: Date = new Date(),
): string | undefined {
  return (
    resolveBlackFridayPromoCode(input, env, now) ??
    resolveBackToWorkPromoCode(input, env)
  );
}
