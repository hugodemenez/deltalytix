import 'server-only'

import { isLocalDashboardAuthBypassEnabled } from "@/lib/local-dashboard-auth";
import Stripe from "stripe";

const stripeSecretKey =
  process.env.STRIPE_SECRET_KEY ||
  (isLocalDashboardAuthBypassEnabled() ? "sk_test_local_dashboard_bypass" : undefined)

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is required outside local dashboard bypass mode.")
}

export const stripe = new Stripe(stripeSecretKey, {
  // https://github.com/stripe/stripe-node#configuration
  apiVersion: "2025-10-29.clover",
});
