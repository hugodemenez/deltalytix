import type { IbkrErrorCodeValue, IbkrErrorParams } from '@/lib/ibkr-flex-errors'

/**
 * Shape stored as JSON in `Synchronization.token`.
 *
 * The Flex Web Service needs both values on every call, and the Synchronization
 * model has a single token column, so they travel together — the same approach
 * the DxFeed integration uses for its credential bundle.
 */
export interface IbkrStoredCredentials {
  token: string
  queryId: string
  /** IBKR account IDs seen in the last statement, for display only. */
  accountNumbers?: string[]
  /** Currencies seen in the last statement; more than one needs a warning. */
  currencies?: string[]
}

export interface IbkrSyncStats {
  /** Total <Trade> rows in the statement, at every level of detail. */
  tradeRows: number
  executionRows: number
  closedLotRows: number
  /** Round-turns produced by FIFO matching. */
  matchedTrades: number
  /** Rows dropped because their date could not be read unambiguously. */
  skippedUnparseableDate: number
  /** Rows dropped for missing side/quantity/price. */
  skippedIncomplete: number
  currencies: string[]
  accountIds: string[]
}

export interface IbkrActionResult {
  error?: IbkrErrorCodeValue
  errorParams?: IbkrErrorParams
}

export interface IbkrConnectResult extends IbkrActionResult {
  success?: boolean
  accountId?: string
  stats?: IbkrSyncStats
  /** Trades written on the connecting call; connecting imports immediately. */
  savedCount?: number
  /** Round-turns found, whether or not they were new. */
  tradesCount?: number
}

export interface IbkrTradesResult extends IbkrActionResult {
  savedCount?: number
  tradesCount?: number
  stats?: IbkrSyncStats
}

/** Client-safe view of a Synchronization row — credentials never leave the server. */
export interface IbkrSyncAccount {
  id: string
  userId: string
  service: string
  /** The Flex query ID; unique per connection for a user. */
  accountId: string
  hasToken: boolean
  tokenExpired: boolean
  accountNumbers: string[]
  currencies: string[]
  lastSyncedAt: Date
  dailySyncTime: Date | null
  createdAt: Date
  updatedAt: Date
}
