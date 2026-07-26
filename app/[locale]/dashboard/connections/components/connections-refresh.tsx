'use client'

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ConnectionService } from '../actions'
import type { ConnectPrefill } from './connect-prefill'

type RefreshFn = () => void

type ConnectionsRefreshContextValue = {
  refresh: () => void
  register: (fn: RefreshFn) => () => void
  /** Open the connect/reconnect sheet for a service (from chrome or a row). */
  connectService: ConnectionService | null
  /** Prefill for reconnect; null when adding a new connection. */
  connectPrefill: ConnectPrefill | null
  openConnect: (service: ConnectionService, prefill?: ConnectPrefill) => void
  closeConnect: () => void
}

const ConnectionsRefreshContext =
  createContext<ConnectionsRefreshContextValue | null>(null)

/**
 * Lets the instant page chrome (header actions / import) ask the streamed
 * list to reload without remounting the Suspense boundary, and lets rows
 * open the shared ConnectServiceModal for reconnect.
 */
export function ConnectionsRefreshProvider({
  children,
}: {
  children: ReactNode
}) {
  const fnRef = useRef<RefreshFn | null>(null)
  const [connectService, setConnectService] =
    useState<ConnectionService | null>(null)
  const [connectPrefill, setConnectPrefill] = useState<ConnectPrefill | null>(
    null
  )

  const register = useCallback((fn: RefreshFn) => {
    fnRef.current = fn
    return () => {
      if (fnRef.current === fn) fnRef.current = null
    }
  }, [])

  const refresh = useCallback(() => {
    fnRef.current?.()
  }, [])

  const openConnect = useCallback(
    (service: ConnectionService, prefill?: ConnectPrefill) => {
      setConnectService(service)
      setConnectPrefill(prefill ?? null)
    },
    []
  )

  const closeConnect = useCallback(() => {
    setConnectService(null)
    setConnectPrefill(null)
  }, [])

  return (
    <ConnectionsRefreshContext.Provider
      value={{
        refresh,
        register,
        connectService,
        connectPrefill,
        openConnect,
        closeConnect,
      }}
    >
      {children}
    </ConnectionsRefreshContext.Provider>
  )
}

export function useConnectionsRefresh() {
  const ctx = useContext(ConnectionsRefreshContext)
  if (!ctx) {
    throw new Error(
      'useConnectionsRefresh must be used within ConnectionsRefreshProvider'
    )
  }
  return ctx
}
