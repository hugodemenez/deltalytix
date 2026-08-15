/** Resend default: 10 requests/sec per team, no burst above that window. */
export const RESEND_TEAM_REQUESTS_PER_SECOND = 10

/**
 * Space individual `emails.send` calls so the weekly recap stays under the
 * team cap and leaves headroom for other senders on the same Resend team.
 * 125ms → 8 requests/sec.
 */
export const RESEND_SEND_INTERVAL_MS = 125

/** Wait for the next per-second window after a 429. */
export const RESEND_RATE_LIMIT_RETRY_MS = 1000

export const RESEND_RATE_LIMIT_RETRIES = 3

export function isResendRateLimitError(
  error: { name?: string } | null,
): boolean {
  return error?.name === "rate_limit_exceeded"
}

export function isResendQuotaError(error: { name?: string } | null): boolean {
  return (
    error?.name === "daily_quota_exceeded" ||
    error?.name === "monthly_quota_exceeded"
  )
}

type PacerClock = {
  now: () => number
  sleep: (ms: number) => Promise<void>
}

/**
 * Serial pacer: each call waits until `intervalMs` has passed since the last
 * one, then records the new send time.
 */
export function createResendRequestPacer(
  intervalMs: number = RESEND_SEND_INTERVAL_MS,
  clock: PacerClock = {
    now: Date.now,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  },
) {
  let nextAllowedAt = 0

  return async function pace() {
    const waitMs = nextAllowedAt - clock.now()
    if (waitMs > 0) {
      await clock.sleep(waitMs)
    }
    nextAllowedAt = clock.now() + intervalMs
  }
}
