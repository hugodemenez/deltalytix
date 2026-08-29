"use server";

import { unstable_cache } from "next/cache";
import { stripe } from "@/server/stripe";
import {
  activeBackToWorkIntervals,
  buildBackToWorkPricingDisplay,
  type BackToWorkCouponLike,
  type BackToWorkPricingDisplay,
  type BackToWorkPromoInterval,
} from "@/lib/back-to-work-promo";

const INTERVAL_ENV_KEY = {
  monthly: "STRIPE_BTW_MONTHLY_PROMO",
  quarterly: "STRIPE_BTW_QUARTERLY_PROMO",
  yearly: "STRIPE_BTW_YEARLY_PROMO",
} as const;

async function couponFromEnvValue(
  value: string,
): Promise<BackToWorkCouponLike | undefined> {
  try {
    const promotion = await stripe.promotionCodes.retrieve(value, {
      expand: ["promotion.coupon"],
    });
    if (!promotion.active) return undefined;

    const coupon = promotion.promotion?.coupon;
    if (!coupon || typeof coupon === "string") return undefined;
    if (coupon.valid === false) return undefined;

    const endsAt = promotion.expires_at ?? coupon.redeem_by ?? null;

    return {
      percentOff: coupon.percent_off ?? null,
      amountOffMinor: coupon.amount_off ?? null,
      redeemByMs: endsAt ? endsAt * 1000 : null,
    };
  } catch {
    return undefined;
  }
}

async function loadBackToWorkPricingDisplay(): Promise<BackToWorkPricingDisplay> {
  const env = process.env;
  const intervals = activeBackToWorkIntervals(env);
  const coupons: Partial<
    Record<BackToWorkPromoInterval, BackToWorkCouponLike>
  > = {};
  let validUntilMs: number | undefined;

  await Promise.all(
    intervals.map(async (interval) => {
      const value = env[INTERVAL_ENV_KEY[interval]]?.trim();
      if (!value) return;

      const coupon = await couponFromEnvValue(value);
      if (!coupon) return;

      coupons[interval] = coupon;
      if (coupon.redeemByMs) {
        validUntilMs =
          validUntilMs === undefined
            ? coupon.redeemByMs
            : Math.min(validUntilMs, coupon.redeemByMs);
      }
    }),
  );

  return buildBackToWorkPricingDisplay(env, coupons, validUntilMs);
}

const loadCachedBackToWorkPricingDisplay = unstable_cache(
  loadBackToWorkPricingDisplay,
  ["back-to-work-pricing-display"],
  { revalidate: 3600 },
);

export async function getBackToWorkPricingDisplay(): Promise<BackToWorkPricingDisplay> {
  if (activeBackToWorkIntervals().length === 0) {
    return {};
  }

  try {
    return await loadCachedBackToWorkPricingDisplay();
  } catch {
    return buildBackToWorkPricingDisplay(process.env, {});
  }
}
