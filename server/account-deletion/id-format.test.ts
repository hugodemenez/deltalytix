import { describe, expect, it } from 'vitest'

import { isUuid } from './id-format'

describe('isUuid', () => {
  it('accepts UUID auth ids and rejects legacy cuids', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(isUuid('clxyz0123456789abcdefghij')).toBe(false)
    expect(isUuid('auth-1')).toBe(false)
  })
})
