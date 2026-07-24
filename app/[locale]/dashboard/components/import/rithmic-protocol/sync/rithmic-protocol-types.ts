export interface RithmicProtocolStoredCredentials {
  username: string
  password: string
  systemName: string
  gatewayUri: string
  accountIds?: string[]
  fcmId?: string
  ibId?: string
  /** From ResponseLogin.unique_user_id — useful for Rithmic support/conformance. */
  uniqueUserId?: string
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
