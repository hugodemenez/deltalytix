import { describe, expect, it } from 'vitest'

import { failureKindFromFlags } from './failure-kind'

describe('failureKindFromFlags', () => {
  it('maps storage/stripe flags', () => {
    expect(failureKindFromFlags(true, false)).toBe('STORAGE')
    expect(failureKindFromFlags(false, true)).toBe('STRIPE')
    expect(failureKindFromFlags(true, true)).toBe('BOTH')
  })
})
