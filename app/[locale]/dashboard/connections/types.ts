import type { ConnectionView } from '@/lib/connection-view'

export type ConnectionService = 'rithmic' | 'tradovate' | 'dxfeed' | 'thor' | 'etp'

export type ConnectionStatus = 'connected' | 'warning' | 'error'

export type ConnectionsPageAccount = {
  id: string
  number: string
  propfirm: string
  connectionId: string | null
  createdAt: Date
  tradeCount: number
  /** ISO date of the account's most recent trade, or null when it has none. */
  lastTradeDate: string | null
}

export type ConnectionsPageConnection = Omit<ConnectionView, 'token'> & {
  accounts: ConnectionsPageAccount[]
  status: ConnectionStatus
  /** Primary label shown in the row (e.g. prop firm for DxFeed). */
  displayName: string
  /** Secondary identity when displayName differs from the login/external id. */
  loginLabel: string | null
  /** Setup/auth error message when the connection exists but is not usable. */
  authError: string | null
}

export type ConnectionsPageData = {
  connections: ConnectionsPageConnection[]
  standaloneAccounts: ConnectionsPageAccount[]
}
