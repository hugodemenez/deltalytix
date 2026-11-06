const DUPLICATE_TRADES = 'DUPLICATE_TRADES'

/** HTTP/API callers must not treat a frozen/degraded ordinary sync as success. */
export function rithmicProtocolSyncHttpSuccess(
  syncStatus: string | undefined,
): boolean {
  return syncStatus !== 'degraded'
}

/** Cron must count a degraded freeze as a failed attempt, not a healthy tick. */
export function rithmicProtocolCronOutcome(result: {
  error?: string
  syncStatus?: string
}): { ok: boolean; reason?: string } {
  if (result.syncStatus === 'degraded') {
    return { ok: false, reason: 'DEGRADED' }
  }
  if (!result.error || result.error === DUPLICATE_TRADES) {
    return { ok: true }
  }
  return { ok: false, reason: result.error }
}
