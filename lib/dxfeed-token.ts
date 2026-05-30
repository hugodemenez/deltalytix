/**
 * DxFeed report tokens may be JWTs with an `exp` claim, or opaque strings with no metadata.
 * When expiry is unknown, we apply DXFEED_TOKEN_TTL_HOURS from connect time (conservative default).
 */

const DEFAULT_TOKEN_TTL_HOURS = 12

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = (4 - (padded.length % 4)) % 4
  return Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf8')
}

/** Read JWT `exp` (seconds) when the report token is a JWT. */
export function getDxFeedTokenExpiryFromJwt(token: string): Date | null {
  const parts = token.trim().split('.')
  if (parts.length !== 3) return null

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { exp?: number }
    if (typeof payload.exp === 'number' && payload.exp > 0) {
      return new Date(payload.exp * 1000)
    }
  } catch {
    return null
  }

  return null
}

export function getDxFeedTokenTtlHours(): number {
  const raw = process.env.DXFEED_TOKEN_TTL_HOURS
  if (raw == null || raw === '') return DEFAULT_TOKEN_TTL_HOURS
  const hours = Number(raw)
  return Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_TOKEN_TTL_HOURS
}

export function resolveDxFeedTokenExpiresAt(accessToken: string, connectedAt = new Date()): Date {
  const fromJwt = getDxFeedTokenExpiryFromJwt(accessToken)
  if (fromJwt && fromJwt.getTime() > connectedAt.getTime()) {
    return fromJwt
  }

  const ttlMs = getDxFeedTokenTtlHours() * 60 * 60 * 1000
  return new Date(connectedAt.getTime() + ttlMs)
}

export function isDxFeedTokenExpired(
  tokenExpiresAt: Date | string | null | undefined,
  now = new Date(),
): boolean {
  if (!tokenExpiresAt) return false
  const expiry =
    tokenExpiresAt instanceof Date ? tokenExpiresAt : new Date(tokenExpiresAt)
  if (Number.isNaN(expiry.getTime())) return false
  return expiry.getTime() <= now.getTime()
}
