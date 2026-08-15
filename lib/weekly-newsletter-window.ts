/**
 * Weekly performance newsletter window (UTC v1).
 *
 * Stats and send decisions use a Monday–Sunday week in UTC, not a rolling
 * lookback.
 */

export type UtcWeekWindow = {
  /** Monday 00:00:00.000 UTC inclusive */
  start: Date
  /** Following Monday 00:00:00.000 UTC exclusive */
  endExclusive: Date
}

/** How long after the Sunday send a re-run still resolves to the same week. */
const RETRY_GRACE_MS = 24 * 60 * 60 * 1000

/**
 * The Mon–Sun UTC week a recap sent *now* should cover: the week the
 * subscriber has just traded, not the one before it.
 *
 * The cron fires Sunday 07:00 UTC while that week still has ~17h to run, so
 * "the last fully finished week" would describe trading that ended eight days
 * earlier. Futures are closed Sunday daytime, so the week is complete in
 * practice by the time the mail goes out.
 *
 * The 24h grace makes a re-run safe: a cron re-triggered Monday morning to
 * repair a partial send resolves to the same week as Sunday's run — and so to
 * the same Resend idempotency key — instead of jumping to the fresh, empty
 * week and mailing nobody.
 */
export function getRecapWeekUtc(now: Date = new Date()): UtcWeekWindow {
  const anchor = new Date(now.getTime() - RETRY_GRACE_MS)

  const utcDay = anchor.getUTCDay() // 0 Sun .. 6 Sat
  const daysSinceMonday = utcDay === 0 ? 6 : utcDay - 1

  const start = new Date(
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth(),
      anchor.getUTCDate() - daysSinceMonday,
    ),
  )

  const endExclusive = new Date(start)
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 7)

  return { start, endExclusive }
}

/** Whether an entryDate string falls in [start, endExclusive). */
export function isEntryInWeek(
  entryDate: string,
  week: UtcWeekWindow,
): boolean {
  const t = new Date(entryDate).getTime()
  if (Number.isNaN(t)) return false
  return t >= week.start.getTime() && t < week.endExclusive.getTime()
}

/**
 * CPO send gate: recap only when the week has trades and net PnL ≥ 0.
 * Net PnL = pnl − commission (already reflected in `netPnL`).
 */
export function shouldSendWeeklyRecap(params: {
  tradeCount: number
  netPnL: number
}): boolean {
  return params.tradeCount > 0 && params.netPnL >= 0
}

export type WeeklyRecapSkipReason = "no_trades" | "negative_net_pnl"

/** Null means send. Does not change the green-week gate. */
export function getWeeklyRecapSkipReason(params: {
  tradeCount: number
  netPnL: number
}): WeeklyRecapSkipReason | null {
  if (shouldSendWeeklyRecap(params)) {
    return null
  }
  return params.tradeCount === 0 ? "no_trades" : "negative_net_pnl"
}
