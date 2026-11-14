export type DeleteAccountBlockedReason = 'billing_check_failed'

export type DeleteAccountResult =
  | { status: 'complete' }
  | { status: 'partial' }
  | { status: 'blocked'; reason: DeleteAccountBlockedReason }

export function isDeleteAccountBlocked(
  result: DeleteAccountResult,
): result is Extract<DeleteAccountResult, { status: 'blocked' }> {
  return result.status === 'blocked'
}
