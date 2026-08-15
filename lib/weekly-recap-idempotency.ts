import { createHash } from "node:crypto"

/**
 * Stable `Idempotency-Key` for one Resend weekly-recap batch send.
 *
 * Keyed on the recap week plus the **input batch** (the subscribers this
 * slice set out to process) — not on who passed the green-week gate or
 * whose build succeeded.
 *
 * If run 1 builds 70 and sends them, then a retry builds 100 (30 recoveries),
 * a key derived from the sent set would change and the original 70 would be
 * mailed twice. Keying on the input batch keeps the key stable, so Resend
 * 409s the retry as designed.
 *
 * Never key on the loop index. Batches are `users.slice(i, i + 100)`, so one
 * unsubscribe between a timed-out run and its retry shifts every boundary.
 */
export function weeklyRecapBatchIdempotencyKey(
  weekStart: Date,
  inputBatchEmails: string[],
): string {
  const recipients = inputBatchEmails
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join(",")

  const digest = createHash("sha256")
    .update(recipients)
    .digest("hex")
    .slice(0, 32)

  return `weekly-recap:${weekStart.toISOString().slice(0, 10)}:${digest}`
}
