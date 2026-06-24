import { describe, expect, it } from 'vitest'
import {
  getDxFeedTokenExpiryFromJwt,
  isDxFeedTokenExpired,
  resolveDxFeedTokenExpiresAt,
} from './dxfeed-token'

describe('dxfeed-token', () => {
  it('reads exp from JWT payload', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const exp = Math.floor(Date.now() / 1000) + 3600
    const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url')
    const token = `${header}.${payload}.sig`

    const expiry = getDxFeedTokenExpiryFromJwt(token)
    expect(expiry).not.toBeNull()
    expect(expiry!.getTime()).toBe(exp * 1000)
  })

  it('detects expired token by clock', () => {
    expect(isDxFeedTokenExpired(new Date(0))).toBe(true)
    expect(isDxFeedTokenExpired(new Date(Date.now() + 60_000))).toBe(false)
  })

  it('falls back to TTL when token is not a JWT', () => {
    const connectedAt = new Date('2026-01-01T12:00:00Z')
    const expiry = resolveDxFeedTokenExpiresAt('opaque-token', connectedAt)
    expect(expiry.getTime()).toBeGreaterThan(connectedAt.getTime())
  })
})
