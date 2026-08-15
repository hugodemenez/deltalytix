"use client";

import { switchSubscriptionPlan } from "@/server/billing";

export function submitBillingCheckout(
  lookupKey: string,
  referralCode?: string | null,
) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/stripe/create-checkout-session";

  const lookupInput = document.createElement("input");
  lookupInput.type = "hidden";
  lookupInput.name = "lookup_key";
  lookupInput.value = lookupKey;
  form.appendChild(lookupInput);

  if (referralCode) {
    const referralInput = document.createElement("input");
    referralInput.type = "hidden";
    referralInput.name = "referral";
    referralInput.value = referralCode;
    form.appendChild(referralInput);
  }

  document.body.appendChild(form);
  form.submit();
}

export type BillingPlanChangeResult =
  | { status: "redirecting" }
  | { status: "switched" }
  | { status: "error"; error: string };

/**
 * Shared plan transition path used by PricingPlans and the dashboard sheet.
 * New customers enter Checkout; existing recurring subscribers use Stripe's
 * subscription switch action, which returns to Checkout for Lifetime.
 */
export async function changeBillingPlan({
  lookupKey,
  hasSubscription,
  referralCode,
}: {
  lookupKey: string;
  hasSubscription: boolean;
  referralCode?: string | null;
}): Promise<BillingPlanChangeResult> {
  if (!hasSubscription) {
    submitBillingCheckout(lookupKey, referralCode);
    return { status: "redirecting" };
  }

  const result = await switchSubscriptionPlan(lookupKey);
  if (result.success) {
    return { status: "switched" };
  }

  if ("requiresCheckout" in result && result.requiresCheckout) {
    submitBillingCheckout(result.lookupKey || lookupKey, referralCode);
    return { status: "redirecting" };
  }

  return {
    status: "error",
    error: result.error || "Failed to switch plan",
  };
}
