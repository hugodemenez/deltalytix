import 'server-only'

import Stripe from "stripe";

// Guard against missing configuration so importing this module never throws.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      // https://github.com/stripe/stripe-node#configuration
      apiVersion: "2025-09-30.clover",
    })
  : null

export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured (missing STRIPE_SECRET_KEY).')
  }
  return stripe
}