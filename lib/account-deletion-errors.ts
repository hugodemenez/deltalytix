export const ACCOUNT_DELETION_STRIPE_PRECHECK_FAILED =
  'ACCOUNT_DELETION_STRIPE_PRECHECK_FAILED'

/** Abort account deletion before any wipe when Stripe lookup cannot complete. */
export class AccountDeletionAbortError extends Error {
  readonly code = ACCOUNT_DELETION_STRIPE_PRECHECK_FAILED

  constructor() {
    super(ACCOUNT_DELETION_STRIPE_PRECHECK_FAILED)
    this.name = 'AccountDeletionAbortError'
  }
}

/** Client-safe: server actions serialize to message, not class identity. */
export function isAccountDeletionStripePrecheckError(
  error: unknown,
): boolean {
  return (
    error instanceof AccountDeletionAbortError ||
    (error instanceof Error &&
      error.message === ACCOUNT_DELETION_STRIPE_PRECHECK_FAILED)
  )
}
