export interface RithmicProtocolStoredCredentials {
  username: string
  password: string
  systemName: string
  /** Connect-point id from `RITHMIC_PROTOCOL_GATEWAYS` (e.g. `core`, `nyc`, `test`). */
  gatewayId?: string
  gatewayUri: string
  accountIds?: string[]
  /**
   * Per-account FCM/IB from ResponseAccountList. Prop-firm plants (LucidTrading,
   * etc.) often differ from the login-level fcmId/ibId — prefer these on sync.
   */
  accounts?: Array<{
    accountId: string
    fcmId?: string
    ibId?: string
  }>
  fcmId?: string
  ibId?: string
  /** From ResponseLogin.unique_user_id — useful for Rithmic support/conformance. */
  uniqueUserId?: string
  /**
   * UTC calendar date (YYYY-MM-DD) when the user started trading this account.
   * Sync walks from this date to today in serial ≤30-day ShowFillHistory windows.
   */
  historyStartDate?: string
}

export interface RithmicProtocolSyncStats {
  tradingAccounts: number
  rawFills: number
  closedTrades: number
  openTradesSkipped: number
  fetchFailures: number
}

export interface RithmicProtocolTradesResult {
  processedTrades?: unknown[]
  savedCount?: number
  tradesCount?: number
  error?: string
  errorParams?: Record<string, string | number>
  syncStats?: RithmicProtocolSyncStats
}

export type RithmicProtocolActionResult =
  | { success: true; message?: string; accountCount?: number }
  | {
      success?: false
      error: string
      errorParams?: Record<string, string | number>
    }
