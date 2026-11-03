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
