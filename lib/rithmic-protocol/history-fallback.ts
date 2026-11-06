export type RithmicProtocolFillSource = 'history' | 'replay'

/**
 * ShowFillHistory is requested in serial ≤30-day windows. Lucid often returns
 * fills for earlier windows and `rp_code 7` (empty) for later ones. Treating
 * "some history exists" as complete skipped order-history, so ReplayExecutions
 * (last ~2 days) was the only source for the gap. FIFO then paired leftover
 * lots from the last history day with fills a week later.
 *
 * Fetch order-history when every window is empty (existing Lucid path) *or*
 * when at least one window is missing. If ShowFillHistory already returned
 * rows, mark the fallback as `replay` so preferHistoryFills / consolidate
 * still drop twins and split pieces.
 */
/**
 * A ShowFillHistory throw (or a window that never returned) is not a complete
 * ledger. Callers must freeze / refuse rather than invent P_0 from a partial
 * stream. Empty windows (`rp_code 7`) are complete — they are not failures.
 */
export function fillHistoryWindowsComplete(input: {
  windowsPlanned: number
  windowsFetched: number
  windowThrew: boolean
  fallbackRequired?: boolean
  fallbackSucceeded?: boolean
  replaySucceeded?: boolean
}): { complete: boolean; windowsFailed: number } {
  const windowsFailed = Math.max(0, input.windowsPlanned - input.windowsFetched)
  const failed = (reasonFailed: boolean) => ({
    complete: false as const,
    windowsFailed: Math.max(windowsFailed, reasonFailed ? 1 : windowsFailed),
  })
  if (input.replaySucceeded === false) {
    return failed(true)
  }
  if (input.fallbackRequired && input.fallbackSucceeded !== true) {
    return failed(true)
  }
  // A ShowFillHistory throw is covered when order-history fallback succeeded
  // for the full requested range — do not freeze the connection in that case.
  if (input.windowThrew && input.fallbackSucceeded !== true) {
    return failed(true)
  }
  if (
    input.windowsPlanned > 0 &&
    input.windowsFetched < input.windowsPlanned &&
    input.fallbackSucceeded !== true
  ) {
    return { complete: false, windowsFailed }
  }
  return { complete: true, windowsFailed: 0 }
}

export function orderHistoryFallbackPlan(input: {
  historyFillCount: number
  missingWindowCount: number
  alreadyFetched: boolean
}): { source: RithmicProtocolFillSource } | null {
  if (input.alreadyFetched) return null
  if (input.historyFillCount === 0) return { source: 'history' }
  if (input.missingWindowCount > 0) return { source: 'replay' }
  return null
}
