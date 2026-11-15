/**
 * Same source as `server/stripe.ts`: a real `STRIPE_SECRET_KEY` env value.
 * Local dashboard bypass may inject a placeholder only inside that module —
 * this check deliberately ignores that placeholder and reads the env only.
 */
export function isStripeSecretConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}
