/**
 * Per-recipient `Idempotency-Key` for one weekly recap send.
 *
 * Resend's batch API takes a single key for the whole request. Any key derived
 * from a set of people (who passed the gate, or the input slice) changes when
 * that set changes — a new subscriber, an unsubscribe, or 30 recoveries on
 * retry — and the original recipients can be mailed twice.
 *
 * One send per recipient, keyed on week + that email, is stable: a retry 409s
 * for anyone already mailed and still delivers recoveries and new subscribers.
 */
export function weeklyRecapIdempotencyKey(
  weekStart: Date,
  email: string,
): string {
  const recipient = email.trim().toLowerCase()
  return `weekly-recap:${weekStart.toISOString().slice(0, 10)}:${recipient}`
}

export function isResendIdempotentReplay(error: { name?: string } | null): boolean {
  return (
    error?.name === "invalid_idempotent_request" ||
    error?.name === "concurrent_idempotent_requests"
  )
}
