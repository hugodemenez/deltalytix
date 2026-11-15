import { afterEach, describe, expect, it } from 'vitest'

import { isStripeSecretConfigured } from './stripe-secret'

describe('isStripeSecretConfigured', () => {
  const original = process.env.STRIPE_SECRET_KEY

  afterEach(() => {
    if (original === undefined) delete process.env.STRIPE_SECRET_KEY
    else process.env.STRIPE_SECRET_KEY = original
  })

  it('reads process.env.STRIPE_SECRET_KEY only', () => {
    delete process.env.STRIPE_SECRET_KEY
    expect(isStripeSecretConfigured()).toBe(false)
    process.env.STRIPE_SECRET_KEY = '  sk_live_x  '
    expect(isStripeSecretConfigured()).toBe(true)
  })
})
