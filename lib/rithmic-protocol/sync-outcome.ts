const DUPLICATE_TRADES = 'DUPLICATE_TRADES'

export const RITHMIC_PROTOCOL_SYNC_DEGRADED_CODE = 'SYNC_DEGRADED'
export const RITHMIC_PROTOCOL_SYNC_RETRY_AFTER_SECONDS = 900

/** HTTP/API callers must not treat a frozen/degraded ordinary sync as success. */
export function rithmicProtocolSyncHttpSuccess(
  syncStatus: string | undefined,
): boolean {
  return syncStatus !== 'degraded'
}

export type RithmicProtocolDashboardSyncDisposition =
  | 'ok'
  | 'degraded'
  | 'duplicate'
  | 'failed'

/** Dashboard toasts and refresh: a freeze still saved some rows. */
export function rithmicProtocolDashboardSyncDisposition(payload: {
  success?: boolean
  message?: string
  syncStatus?: string
}): RithmicProtocolDashboardSyncDisposition {
  if (payload.message === DUPLICATE_TRADES) return 'duplicate'
  if (
    payload.syncStatus === 'degraded' ||
    payload.message === RITHMIC_PROTOCOL_SYNC_DEGRADED_CODE
  ) {
    return 'degraded'
  }
  if (payload.success === false) return 'failed'
  return 'ok'
}

export function rithmicProtocolSyncDegradedDetails(result: {
  savedCount?: number
  tradesCount?: number
  syncStatus?: string
  syncStats?: {
    rawFills?: number
    fillsAfterDedup?: number
    closedTrades?: number
    openTradesSkipped?: number
    savedCount?: number
  }
}): { field: string; message: string }[] {
  return [
    { field: 'syncStatus', message: result.syncStatus ?? 'degraded' },
    { field: 'savedCount', message: String(result.savedCount ?? 0) },
    { field: 'tradesCount', message: String(result.tradesCount ?? 0) },
    {
      field: 'fillsAfterDedup',
      message: String(result.syncStats?.fillsAfterDedup ?? 0),
    },
    {
      field: 'closedTrades',
      message: String(result.syncStats?.closedTrades ?? 0),
    },
    {
      field: 'openTradesSkipped',
      message: String(result.syncStats?.openTradesSkipped ?? 0),
    },
  ]
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
