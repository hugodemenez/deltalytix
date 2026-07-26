import type { ConnectionService } from '../actions'

/**
 * Optional values carried into the connect sheet when reconnecting an
 * existing connection. Passwords are never prefilled.
 */
export type ConnectPrefill = {
  service: ConnectionService
  /** Login / external id (DxFeed email, Rithmic username, etc.). */
  accountId?: string
  /** Primary row label — used to resolve DxFeed prop firm by name. */
  displayName?: string
  environment?: string
}
