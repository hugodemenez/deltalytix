import { billingLookupKey } from "@/lib/billing-plan-catalog";

// Verified live Stripe promotion code for coupon DLX_ADS10_USD_20260822.
export const ADS10_PROMOTION_CODE_ID = "promo_1U7JkyCgu8zCkThC3eVlGJni";

type Ads10CheckoutEligibility = {
  lookupKey: string;
  price: {
    currency?: string | null;
    type?: string | null;
    recurring?: {
      interval?: string | null;
      interval_count?: number | null;
    } | null;
  };
  country?: string | null;
  gclid?: string | null;
  hasPriorBillingHistory: boolean;
};

export function ads10PromotionCodeForCheckout({
  lookupKey,
  price,
  country,
  gclid,
  hasPriorBillingHistory,
}: Ads10CheckoutEligibility): string | null {
  if (hasPriorBillingHistory) return null;

  const isMonthlyUsdPlus =
    lookupKey === billingLookupKey("monthly", "USD") &&
    price.currency?.toLowerCase() === "usd" &&
    price.type === "recurring" &&
    price.recurring?.interval === "month" &&
    (price.recurring.interval_count ?? 1) === 1;

  if (!isMonthlyUsdPlus) return null;

  const isUsShopper = country?.trim().toUpperCase() === "US";
  const hasGoogleClickId = Boolean(gclid?.trim());

  return isUsShopper || hasGoogleClickId ? ADS10_PROMOTION_CODE_ID : null;
}
