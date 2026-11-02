/**
 * Rithmic ShowFillHistory is capped at 30 calendar days per request (plant
 * guidance). ReplayExecutions is indexed by ssboe and is much shorter: many
 * plants only retain about two calendar days. Asking for more is safe when
 * the plant silently returns a shorter slice; a hard failure retries at 2d.
 */
export const SHOW_FILL_HISTORY_MAX_WINDOW_DAYS = 30

/** Default ReplayExecutions window. Override with RITHMIC_PROTOCOL_REPLAY_LOOKBACK_DAYS. */
export const DEFAULT_REPLAY_LOOKBACK_DAYS = 7

/** Fallback when a longer ReplayExecutions request is rejected or times out. */
export const FALLBACK_REPLAY_LOOKBACK_DAYS = 2

export function parseReplayLookbackDays(
  raw: string | undefined = process.env.RITHMIC_PROTOCOL_REPLAY_LOOKBACK_DAYS,
): number {
  const parsed = Number(raw ?? DEFAULT_REPLAY_LOOKBACK_DAYS)
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_REPLAY_LOOKBACK_DAYS
  return Math.floor(parsed)
}

export function resolveReplayLookbackDays(options: {
  syncRangeDays: number
  requestedDays?: number
}): { primary: number; fallback: number } {
  const requested = Math.max(
    1,
    options.requestedDays ?? parseReplayLookbackDays(),
  )
  const syncRange = Math.max(1, Math.floor(options.syncRangeDays))
  const primary = Math.min(syncRange, requested)
  const fallback = Math.min(primary, FALLBACK_REPLAY_LOOKBACK_DAYS)
  return { primary, fallback }
}

export function replayWindowStartSsboe(
  finishSsboe: number,
  lookbackDays: number,
): number {
  const days = Math.max(1, Math.floor(lookbackDays))
  return finishSsboe - days * 24 * 60 * 60
}
