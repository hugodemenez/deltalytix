export interface DxFeedLoginRequest {
  login: string
  password: string
  environment: number
  version: number
  withDetails: boolean
  connectOnlyTrading: boolean
}

export interface DxFeedLoginResponse {
  status: string
  token?: string
  reason?: string
  details?: string[]
}

/**
 * Stored as JSON in the Synchronization.token field.
 * Contains both the access token and the historical API host
 * returned by the auth endpoint.
 */
export interface DxFeedStoredCredentials {
  accessToken: string
  historicalHost: string
  accountNumbers?: string[]
}

export interface DxFeedTradingAccount {
  accountId: number
  accountReference: string | null
  accountHeader: string | null
}

export interface DxFeedAccountListResponse {
  success: boolean
  data: DxFeedTradingAccount[] | null
}

export interface DxFeedContractDetail {
  symbolId: number
  symbol: string | null
  exchange: string | null
  contractName: string | null
  tradableQuantityFractionable: number
  tradableQuantityMinimum: number
}

export interface DxFeedReportTrade {
  tradeId: number
  contract: DxFeedContractDetail | null
  contractId: number
  entryDate: number
  exitDate: number
  quantity: number
  entryPrice: number
  exitPrice: number
  grossPl: number
  netPl: number
  convertedGrossPl: number
  convertedNetPl: number
  overnight: boolean
  overweekend: boolean
  isCloseTrade: boolean
  maxQuantity: number | null
  tradePl: number | null
  convertedTradePl: number | null
  maxDrawdown: number | null
  maxRunup: number | null
  currency: string | null
}

export interface DxFeedTradesResponse {
  success: boolean
  data: DxFeedReportTrade[] | null
}

export interface DxFeedTradesMultiAccountResponse {
  success: boolean
  data: {
    accountId: number
    accountReference: string | null
    accountHeader: string | null
    data: DxFeedReportTrade[] | null
  } | null
}

export interface DxFeedTradesResult {
  processedTrades?: import('@/prisma/generated/prisma/client').Trade[]
  savedCount?: number
  tradesCount?: number
  error?: string
}
