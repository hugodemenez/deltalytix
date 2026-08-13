/**
 * Weekly performance newsletter window (UTC v1).
 *
 * Stats and send decisions use the last complete Monday–Sunday week in UTC,
 * not a rolling lookback.
 */

export type UtcWeekWindow = {
  /** Monday 00:00:00.000 UTC inclusive */
  start: Date
  /** Following Monday 00:00:00.000 UTC exclusive */
  endExclusive: Date
}

/**
 * Most recent fully finished Mon–Sun week in UTC.
 * While the current UTC week is in progress, returns the previous Mon–Sun.
 */
export function getLastCompleteWeekUtc(now: Date = new Date()): UtcWeekWindow {
  const utcDay = now.getUTCDay() // 0 Sun .. 6 Sat
  const daysSinceMonday = utcDay === 0 ? 6 : utcDay - 1

  const thisMonday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysSinceMonday,
    ),
  )

  const start = new Date(thisMonday)
  start.setUTCDate(start.getUTCDate() - 7)

  return { start, endExclusive: thisMonday }
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
