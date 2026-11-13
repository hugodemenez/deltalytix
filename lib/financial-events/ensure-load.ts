import type { FinancialEvent } from "@/prisma/generated/prisma/browser"

/** First attempt plus two retries. A failed window is never marked loaded. */
export const FINANCIAL_EVENT_LOAD_ATTEMPTS = 3

const FINANCIAL_EVENT_RETRY_BACKOFF_MS = 1_000

/**
 * Delay before attempt `attempts` (the number already recorded). The first
 * fetch is immediate. The next two wait 1s, then 2s.
 */
export function financialEventRetryDelayMs(attempts: number): number {
  if (attempts <= 0) return 0
  return FINANCIAL_EVENT_RETRY_BACKOFF_MS * 2 ** (attempts - 1)
}

export function financialEventLoadKey(
  lang: string,
  startMs: number,
  endMs: number,
): string {
  return `${lang}:${startMs}:${endMs}`
}

export function shouldLoadFinancialEvents(input: {
  initialized: boolean
  covered: boolean
  attempts: number
}): "load" | "skip" | "error" {
  if (!input.initialized || input.covered) return "skip"
  if (input.attempts >= FINANCIAL_EVENT_LOAD_ATTEMPTS) return "error"
  return "load"
}

/**
 * One fetch. Success is the only path that records the range. A rejection
 * reports the error and leaves the range unloaded so the caller can retry.
 */
export async function performFinancialEventLoad(input: {
  fetchWindow: () => Promise<FinancialEvent[]>
  merge: (events: FinancialEvent[]) => void
  fail: (message: string) => void
}): Promise<"loaded" | "failed"> {
  try {
    const events = await input.fetchWindow()
    input.merge(events)
    return "loaded"
  } catch (error) {
    input.fail(error instanceof Error ? error.message : String(error))
    return "failed"
  }
}
