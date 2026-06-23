/**
 * Tradovate OAuth tokens are stored with an explicit expiry timestamp.
 * A non-null token with a past expiry is unusable for sync (see getTradovateToken).
 */
export function isTradovateTokenExpired(
  token: string | null | undefined,
  tokenExpiresAt: Date | string | null | undefined,
  now = new Date(),
): boolean {
  if (!token) return true;
  if (!tokenExpiresAt) return false;

  const expiry =
    tokenExpiresAt instanceof Date ? tokenExpiresAt : new Date(tokenExpiresAt);
  if (Number.isNaN(expiry.getTime())) return false;

  return expiry.getTime() <= now.getTime();
}
