/**
 * Restrict a Protocol sync to trading accounts that already belong to the
 * stored connection. Unknown numbers are rejected so an admin rebuild cannot
 * fetch a different user's account id on this login.
 */
export function scopeProtocolAccountIds(
  available: string[],
  requested?: string[],
): { accountIds: string[] } | { error: 'ACCOUNT_NOT_ON_CONNECTION' } {
  if (!requested || requested.length === 0) {
    return { accountIds: [...available] }
  }
  const allowed = new Set(available)
  const accountIds: string[] = []
  const seen = new Set<string>()
  for (const accountNumber of requested) {
    const trimmed = accountNumber.trim()
    if (!trimmed || seen.has(trimmed)) continue
    if (!allowed.has(trimmed)) {
      return { error: 'ACCOUNT_NOT_ON_CONNECTION' }
    }
    seen.add(trimmed)
    accountIds.push(trimmed)
  }
  if (accountIds.length === 0) {
    return { error: 'ACCOUNT_NOT_ON_CONNECTION' }
  }
  return { accountIds }
}
