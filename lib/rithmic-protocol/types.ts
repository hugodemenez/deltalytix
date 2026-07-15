export interface RithmicProtocolAccount {
  accountId: string
  accountName?: string
  fcmId?: string
  ibId?: string
  currency?: string
}

export interface RithmicProtocolFill {
  accountId: string
  fcmId?: string
  ibId?: string
  symbol: string
  exchange?: string
  /** BUY / SELL / SS or numeric string */
  transactionType: string
  fillPrice: number
  fillSize: number
  fillId?: string
  fillDate?: string
  fillTime?: string
  basketId?: string
  sequenceNumber?: string
  ssboe?: number
  usecs?: number
  avgFillPrice?: number
}

export interface RithmicProtocolCredentials {
  username: string
  password: string
  systemName: string
  /** Full wss:// host:port URI */
  gatewayUri: string
  /** Trading account ids selected for sync; empty = all */
  accountIds?: string[]
  fcmId?: string
  ibId?: string
}

export interface RithmicProtocolConnectResult {
  accounts: RithmicProtocolAccount[]
  fcmId?: string
  ibId?: string
  uniqueUserId?: string
}

export type RithmicProtocolActionResult =
  | { success: true; message?: string }
  | {
      success?: false
      error: string
      errorParams?: Record<string, string | number>
    }
