/** First try plus two retries while the user stays on the same range. */
export const FINANCIAL_EVENTS_MAX_ATTEMPTS = 3

export type FinancialEventsEnsureStatus = "idle" | "loading" | "ready" | "error"

/**
 * `idle` — this view never received the dashboard payload (shared dashboards).
 * `loading` — the visible range is not loaded yet, and attempts remain.
 * `ready` — the range is covered, including a successful empty result.
 * `error` — the last attempt failed, so an empty list is not "no events".
 */
export function financialEventsEnsureStatus(input: {
  seeded: boolean
  covered: boolean
  attempts: number
}): FinancialEventsEnsureStatus {
  if (!input.seeded) return "idle"
  if (input.covered) return "ready"
  if (input.attempts >= FINANCIAL_EVENTS_MAX_ATTEMPTS) return "error"
  return "loading"
}

/** Delay before attempt `nextAttempt` (1 = first retry). */
export function financialEventsRetryDelayMs(nextAttempt: number): number {
  return 400 * nextAttempt
}
