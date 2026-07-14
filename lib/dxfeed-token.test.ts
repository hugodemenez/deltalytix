import { describe, expect, it } from 'vitest'
import {
  getDxFeedTokenExpiryFromProvider,
  getDxFeedTokenExpiryFromJwt,
  isDxFeedAccessTokenExpired,
  isDxFeedTokenExpired,
  resolveDxFeedTokenExpiresAt,
} from './dxfeed-token'

function createJwt(exp: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url')
  return `${header}.${payload}.sig`
}

describe('dxfeed-token', () => {
  it('reads exp from JWT payload', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const token = createJwt(exp)

    const expiry = getDxFeedTokenExpiryFromJwt(token)
    expect(expiry).not.toBeNull()
    expect(expiry!.getTime()).toBe(exp * 1000)
  })

  it('detects expired token by clock', () => {
    expect(isDxFeedTokenExpired(new Date(0))).toBe(true)
    expect(isDxFeedTokenExpired(new Date(Date.now() + 60_000))).toBe(false)
  })

  it('uses the provider-supplied Unix millisecond expiry', () => {
    const expirationMs = Date.parse('2026-07-20T11:59:43.816Z')
    expect(getDxFeedTokenExpiryFromProvider(expirationMs)?.getTime()).toBe(expirationMs)
    expect(resolveDxFeedTokenExpiresAt('opaque-token', expirationMs)?.getTime()).toBe(
      expirationMs,
    )
  })

  it('does not invent an expiry for a legacy opaque token', () => {
    expect(resolveDxFeedTokenExpiresAt('opaque-token')).toBeNull()
  })

  it('ignores guessed legacy TTL timestamps for opaque tokens', () => {
    expect(
      isDxFeedAccessTokenExpired(
        'opaque-token',
        new Date('2026-01-01T00:00:00Z'),
        { now: new Date('2026-07-01T00:00:00Z') },
      ),
    ).toBe(false)
  })

  it('honors authoritative provider expiry for opaque tokens', () => {
    expect(
      isDxFeedAccessTokenExpired(
        'opaque-token',
        new Date('2026-01-01T00:00:00Z'),
        {
          expirationIsAuthoritative: true,
          now: new Date('2026-07-01T00:00:00Z'),
        },
      ),
    ).toBe(true)
  })

  it('honors explicit server invalidation for opaque tokens', () => {
    expect(isDxFeedAccessTokenExpired('opaque-token', new Date(0))).toBe(true)
  })

  it('uses JWT exp as the authoritative expiry', () => {
    const now = new Date('2026-07-01T00:00:00Z')
    const expiredJwt = createJwt(Math.floor(now.getTime() / 1000) - 1)
    const validJwt = createJwt(Math.floor(now.getTime() / 1000) + 3600)

    expect(isDxFeedAccessTokenExpired(expiredJwt, null, { now })).toBe(true)
    expect(isDxFeedAccessTokenExpired(validJwt, null, { now })).toBe(false)
  })
})
