/**
 * DxFeed v2 returns the report token expiry separately in Unix milliseconds.
 * Older report tokens may instead be JWTs, or opaque tokens with no metadata.
 */

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

export function getDxFeedTokenExpiryFromProvider(
  expirationMs: number | null | undefined,
): Date | null {
  if (typeof expirationMs !== 'number' || !Number.isFinite(expirationMs) || expirationMs <= 0) {
    return null
  }

  const expiry = new Date(expirationMs)
  return Number.isNaN(expiry.getTime()) ? null : expiry
}

export function resolveDxFeedTokenExpiresAt(
  accessToken: string,
  providerExpirationMs?: number | null,
): Date | null {
  return (
    getDxFeedTokenExpiryFromProvider(providerExpirationMs) ??
    getDxFeedTokenExpiryFromJwt(accessToken)
  )
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

/**
 * Ignore guessed legacy TTL values for opaque tokens while honoring provider
 * expiries, JWT claims, and the epoch-zero invalidation marker written after a
 * real 401/403 response.
 */
export function isDxFeedAccessTokenExpired(
  accessToken: string,
  tokenExpiresAt: Date | string | null | undefined,
  options: { expirationIsAuthoritative?: boolean; now?: Date } = {},
): boolean {
  const { expirationIsAuthoritative = false, now = new Date() } = options
  const storedExpiry = tokenExpiresAt
    ? tokenExpiresAt instanceof Date
      ? tokenExpiresAt
      : new Date(tokenExpiresAt)
    : null

  if (storedExpiry && !Number.isNaN(storedExpiry.getTime())) {
    if (storedExpiry.getTime() === 0) return true
    if (expirationIsAuthoritative) {
      return storedExpiry.getTime() <= now.getTime()
    }
  }

  const jwtExpiry = getDxFeedTokenExpiryFromJwt(accessToken)
  return jwtExpiry ? jwtExpiry.getTime() <= now.getTime() : false
}
