import { createHash } from "node:crypto"

/**
 * Stable `Idempotency-Key` for one Resend weekly-recap batch send.
 *
 * Derived from the recap week plus the batch's own recipients — never from the
 * loop index. Batches are `users.slice(i, i + 100)`, so a single unsubscribe
 * between a timed-out run and its retry shifts every boundary and makes
 * "batch 0" mean a different set of people. Keying on the contents survives
 * that: same week + same recipients = same key, and Resend refuses the
 * duplicate instead of mailing everyone twice.
 */
export function weeklyRecapBatchIdempotencyKey(
  weekStart: Date,
  emails: { to: string[] }[],
): string {
  const recipients = emails
    .flatMap((email) => email.to)
    .map((address) => address.trim().toLowerCase())
    .sort()
    .join(",")

  const digest = createHash("sha256")
    .update(recipients)
    .digest("hex")
    .slice(0, 32)

  return `weekly-recap:${weekStart.toISOString().slice(0, 10)}:${digest}`
}
